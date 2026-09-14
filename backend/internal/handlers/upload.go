package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// POST /api/v1/upload?type=service|staff|product|general
// Accepts: multipart/form-data, field name "file"
// Returns: { "url": "/uploads/<salonID>/<type>/<filename>" }
func (a *App) UploadFile(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if claims.SalonID == 0 {
		a.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// 10 MB max
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		a.Error(w, http.StatusBadRequest, "file too large (max 10 MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		a.Error(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	// Validate MIME type — images only
	buf := make([]byte, 512)
	if _, err := file.Read(buf); err != nil {
		a.Error(w, http.StatusBadRequest, "could not read file")
		return
	}
	mime := http.DetectContentType(buf)
	if !strings.HasPrefix(mime, "image/") {
		a.Error(w, http.StatusBadRequest, "only image files are allowed")
		return
	}
	// Rewind so we can copy from the beginning
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		a.Error(w, http.StatusInternalServerError, "seek error")
		return
	}

	uploadType := r.URL.Query().Get("type")
	if uploadType == "" {
		uploadType = "general"
	}

	// Build unique filename: timestamp + original extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	fname := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	// Directory: ./uploads/<salon_id>/<type>/
	dir := filepath.Join("uploads", fmt.Sprintf("%d", claims.SalonID), uploadType)
	if err := os.MkdirAll(dir, 0755); err != nil {
		a.Error(w, http.StatusInternalServerError, "could not create directory")
		return
	}

	dest := filepath.Join(dir, fname)
	out, err := os.Create(dest)
	if err != nil {
		a.Error(w, http.StatusInternalServerError, "could not save file")
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		a.Error(w, http.StatusInternalServerError, "could not write file")
		return
	}

	// URL served statically at /uploads/...
	url := "/" + filepath.ToSlash(dest)
	a.JSON(w, http.StatusOK, map[string]string{"url": url})
}
