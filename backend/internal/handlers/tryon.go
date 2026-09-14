package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

// TryOn POST /api/tryon — authenticated (owner app). Proxies the AI style-preview
// request to OpenAI or Replicate using server-side keys, so the mobile client
// never holds a live API key.
// multipart form fields: image (file), provider ("openai"|"replicate"),
// style_name, style_prompt, category.
func (a *App) TryOn(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		a.Error(w, http.StatusBadRequest, "file too large (max 8MB)")
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "no image provided")
		return
	}
	defer file.Close()

	selfie, err := io.ReadAll(file)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "could not read image")
		return
	}

	provider := r.FormValue("provider")
	styleName := r.FormValue("style_name")
	stylePrompt := r.FormValue("style_prompt")
	category := r.FormValue("category")

	var imageBytes []byte
	switch provider {
	case "replicate":
		imageBytes, err = a.tryOnReplicate(r, selfie, styleName, stylePrompt, category)
	default:
		imageBytes, err = a.tryOnOpenAI(r, selfie, styleName, stylePrompt)
	}
	if err != nil {
		a.Error(w, http.StatusBadGateway, err.Error())
		return
	}

	a.JSON(w, http.StatusOK, map[string]any{
		"image_b64": base64.StdEncoding.EncodeToString(imageBytes),
	})
}

func (a *App) tryOnOpenAI(r *http.Request, selfie []byte, styleName, stylePrompt string) ([]byte, error) {
	if a.OpenAIKey == "" {
		return nil, fmt.Errorf("AI try-on is not configured")
	}

	prompt := fmt.Sprintf(
		"Edit only the %s: %s. "+
			"PRESERVE EXACTLY — do not alter: "+
			"the person's face, facial structure, eyes, nose, mouth, skin tone, skin texture, "+
			"age, body shape, clothing, outfit, accessories, pose, background, and lighting. "+
			"The face must look identical to the input photo. "+
			"Apply ONLY the requested %s change and nothing else. "+
			"Photorealistic, professional salon photography.",
		styleName, stylePrompt, styleName,
	)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	mw.WriteField("model", "gpt-image-1")
	mw.WriteField("prompt", prompt)
	mw.WriteField("n", "1")
	mw.WriteField("size", "1024x1024")
	part, err := mw.CreateFormFile("image", "photo.jpg")
	if err != nil {
		return nil, err
	}
	part.Write(selfie)
	mw.Close()

	req, err := http.NewRequestWithContext(r.Context(), "POST", "https://api.openai.com/v1/images/edits", &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+a.OpenAIKey)
	req.Header.Set("Content-Type", mw.FormDataContentType())

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		var errBody struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		json.Unmarshal(body, &errBody)
		if errBody.Error.Message != "" {
			return nil, fmt.Errorf("%s", errBody.Error.Message)
		}
		return nil, fmt.Errorf("openai error: %s", string(body))
	}

	var data struct {
		Data []struct {
			B64JSON string `json:"b64_json"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &data); err != nil || len(data.Data) == 0 {
		return nil, fmt.Errorf("unexpected openai response")
	}
	return base64.StdEncoding.DecodeString(data.Data[0].B64JSON)
}

const replicateModel = "black-forest-labs/flux-kontext-pro"

func tryOnBuildPrompt(category, stylePrompt string) string {
	const faceLock = "The face, facial expression, skin tone, skin texture, lips, eyes, " +
		"nose, and all facial features must be pixel-for-pixel identical to " +
		"the input image. Do not alter clothing, body, background, or " +
		"lighting in any way."

	switch strings.ToLower(strings.TrimSpace(category)) {
	case "hair colour", "hair color":
		return fmt.Sprintf("Change the hair color to %s. Do not change the hair length or hair style. %s", stylePrompt, faceLock)
	case "hair cuts", "haircut", "hairstyle":
		return fmt.Sprintf("Change the hair cut and length to %s. Do not change the hair color. %s", stylePrompt, faceLock)
	case "lash styles", "lashes":
		return fmt.Sprintf("Change only the eyelashes to %s. Do not change the eyebrows. %s", stylePrompt, faceLock)
	case "eyebrows":
		return fmt.Sprintf("Change only the eyebrow shape and fill to %s. Do not change the eyelashes. %s", stylePrompt, faceLock)
	case "makeup":
		return fmt.Sprintf("Apply %s makeup only. Do not change the hair, skin tone, or skin texture. %s", stylePrompt, faceLock)
	default:
		return fmt.Sprintf("Apply %s to the %s only. %s", stylePrompt, category, faceLock)
	}
}

func (a *App) tryOnReplicate(r *http.Request, selfie []byte, styleName, stylePrompt, category string) ([]byte, error) {
	if a.ReplicateToken == "" {
		return nil, fmt.Errorf("AI try-on is not configured")
	}

	base64Image := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(selfie)
	prompt := tryOnBuildPrompt(category, stylePrompt)

	reqBody, _ := json.Marshal(map[string]any{
		"input": map[string]any{
			"input_image":      base64Image,
			"prompt":           prompt,
			"aspect_ratio":     "1:1",
			"output_format":    "jpg",
			"safety_tolerance": 2,
		},
	})

	client := &http.Client{Timeout: 40 * time.Second}
	createReq, _ := http.NewRequestWithContext(r.Context(), "POST",
		"https://api.replicate.com/v1/models/"+replicateModel+"/predictions", bytes.NewReader(reqBody))
	createReq.Header.Set("Authorization", "Bearer "+a.ReplicateToken)
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Prefer", "wait=30")

	createRes, err := client.Do(createReq)
	if err != nil {
		return nil, err
	}
	defer createRes.Body.Close()
	body, _ := io.ReadAll(createRes.Body)
	if createRes.StatusCode != 200 && createRes.StatusCode != 201 {
		return nil, fmt.Errorf("replicate error: %s", string(body))
	}

	var prediction struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		Output any    `json:"output"`
	}
	if err := json.Unmarshal(body, &prediction); err != nil {
		return nil, fmt.Errorf("unexpected replicate response")
	}

	var imageURL string
	if prediction.Status == "succeeded" {
		imageURL, err = tryOnExtractURL(prediction.Output)
	} else {
		imageURL, err = a.tryOnPollReplicate(r, prediction.ID)
	}
	if err != nil {
		return nil, err
	}

	imgRes, err := client.Get(imageURL)
	if err != nil {
		return nil, err
	}
	defer imgRes.Body.Close()
	if imgRes.StatusCode != 200 {
		return nil, fmt.Errorf("failed to download result image")
	}
	return io.ReadAll(imgRes.Body)
}

func tryOnExtractURL(output any) (string, error) {
	switch v := output.(type) {
	case []any:
		if len(v) > 0 {
			if s, ok := v[0].(string); ok {
				return s, nil
			}
		}
	case string:
		return v, nil
	}
	return "", fmt.Errorf("unexpected output format from replicate")
}

func (a *App) tryOnPollReplicate(r *http.Request, id string) (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	for i := 0; i < 40; i++ {
		time.Sleep(2 * time.Second)
		req, _ := http.NewRequestWithContext(r.Context(), "GET",
			"https://api.replicate.com/v1/predictions/"+id, nil)
		req.Header.Set("Authorization", "Bearer "+a.ReplicateToken)
		res, err := client.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		var data struct {
			Status string `json:"status"`
			Output any    `json:"output"`
			Error  string `json:"error"`
		}
		json.Unmarshal(body, &data)
		if data.Status == "succeeded" {
			return tryOnExtractURL(data.Output)
		}
		if data.Status == "failed" || data.Status == "canceled" {
			return "", fmt.Errorf("generation failed: %s", data.Error)
		}
	}
	return "", fmt.Errorf("timed out waiting for replicate result")
}
