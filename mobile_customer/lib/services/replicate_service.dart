import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

// Set via --dart-define=REPLICATE_TOKEN=... at build time
const _kReplicateToken = String.fromEnvironment('REPLICATE_TOKEN');

const _kModel = 'black-forest-labs/flux-kontext-pro';

class ReplicateService {
  /// Returns PNG/WebP bytes — same interface as OpenAIImageService.
  static Future<Uint8List> tryOnStyle({
    required File selfie,
    required String styleName,
    required String stylePrompt,
  }) async {
    final bytes = await selfie.readAsBytes();
    final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';

    final createRes = await http.post(
      Uri.parse('https://api.replicate.com/v1/models/$_kModel/predictions'),
      headers: {
        'Authorization': 'Bearer $_kReplicateToken',
        'Content-Type': 'application/json',
        'Prefer': 'wait=30',
      },
      body: jsonEncode({
        'input': {
          'input_image': base64Image,
          'prompt':
              'The same person with $stylePrompt. Keep the exact same face, skin tone, and facial features. '
              'Only change the hair/look. Photorealistic, high quality, salon photography.',
          'aspect_ratio': '3:4',
          'output_format': 'webp',
          'safety_tolerance': 2,
        },
      }),
    );

    if (createRes.statusCode != 200 && createRes.statusCode != 201) {
      throw Exception('Replicate error: ${createRes.body}');
    }

    final prediction = jsonDecode(createRes.body) as Map<String, dynamic>;

    String imageUrl;
    if (prediction['status'] == 'succeeded') {
      imageUrl = _extractUrl(prediction['output']);
    } else {
      imageUrl = await _poll(prediction['id'] as String);
    }

    // Download image bytes so callers always get Uint8List (same as OpenAI)
    final imgRes = await http.get(Uri.parse(imageUrl));
    if (imgRes.statusCode != 200) {
      throw Exception('Failed to download result image');
    }
    return imgRes.bodyBytes;
  }

  static String _extractUrl(dynamic output) {
    if (output is List && output.isNotEmpty) return output.first as String;
    if (output is String) return output;
    throw Exception('Unexpected output format from Replicate');
  }

  static Future<String> _poll(String id) async {
    for (int i = 0; i < 40; i++) {
      await Future.delayed(const Duration(seconds: 2));
      final res = await http.get(
        Uri.parse('https://api.replicate.com/v1/predictions/$id'),
        headers: {'Authorization': 'Bearer $_kReplicateToken'},
      );
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final status = data['status'] as String?;
      if (status == 'succeeded') return _extractUrl(data['output']);
      if (status == 'failed' || status == 'canceled') {
        throw Exception('Generation failed: ${data['error']}');
      }
    }
    throw Exception('Timed out waiting for Replicate result');
  }
}
