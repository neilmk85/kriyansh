import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

// Set via --dart-define=OPENAI_KEY=... at build time
const _kOpenAIKey = String.fromEnvironment('OPENAI_KEY');

class OpenAIImageService {
  /// Takes the customer's selfie + a style description.
  /// Returns raw PNG bytes for display with Image.memory().
  static Future<Uint8List> tryOnStyle({
    required File selfie,
    required String styleName,
    required String stylePrompt,
  }) async {
    final prompt =
        'The same person with $stylePrompt. '
        'Keep the exact same face, skin tone, facial features, and expression. '
        'Only change the hair or makeup look as described. '
        'Photorealistic, high quality, professional salon photography lighting.';

    final request = http.MultipartRequest(
      'POST',
      Uri.parse('https://api.openai.com/v1/images/edits'),
    );

    request.headers['Authorization'] = 'Bearer $_kOpenAIKey';
    request.fields['model']  = 'gpt-image-1';
    request.fields['prompt'] = prompt;
    request.fields['n']      = '1';
    request.fields['size']   = '1024x1024';

    request.files.add(await http.MultipartFile.fromPath('image', selfie.path));

    final streamed = await request.send().timeout(const Duration(seconds: 60));
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final msg  = (body['error'] as Map?)?['message'] ?? response.body;
      throw Exception(msg);
    }

    final data      = jsonDecode(response.body) as Map<String, dynamic>;
    final imageData = (data['data'] as List).first as Map<String, dynamic>;
    final b64       = imageData['b64_json'] as String;

    return base64Decode(b64);
  }
}
