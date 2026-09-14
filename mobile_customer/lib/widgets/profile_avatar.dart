import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../data/app_session.dart';
import 'floating_bottom_nav.dart';

// Circular avatar that shows the user's picked photo, falling back to a
// solid-color initial when none has been chosen yet — or if the picked bytes
// fail to decode (e.g. a HEIC photo, which browsers' image decoders can't
// read even though iOS/Android decode it natively).
class ProfileAvatar extends StatefulWidget {
  final double radius;
  final String initial;

  const ProfileAvatar({super.key, required this.radius, required this.initial});

  @override
  State<ProfileAvatar> createState() => _ProfileAvatarState();
}

class _ProfileAvatarState extends State<ProfileAvatar> {
  Uint8List? _failedBytes;

  @override
  Widget build(BuildContext context) {
    final bytes = AppSession.profileImageBytes;
    final showImage = bytes != null && !identical(bytes, _failedBytes);
    return CircleAvatar(
      radius: widget.radius,
      backgroundColor: kNavTeal,
      backgroundImage: showImage ? MemoryImage(bytes) : null,
      onBackgroundImageError: showImage
          ? (error, stackTrace) {
              debugPrint('Profile photo failed to decode: $error');
              if (mounted) setState(() => _failedBytes = bytes);
            }
          : null,
      child: showImage
          ? null
          : Text(
              widget.initial,
              style: TextStyle(color: Colors.white, fontSize: widget.radius * 0.8, fontWeight: FontWeight.w700),
            ),
    );
  }
}

// Opens a full-screen view of the current profile photo (or the fallback
// initial circle, enlarged) on a black backdrop. Tap anywhere or the close
// button to dismiss.
void showProfilePhotoViewer(BuildContext context, {required String initial}) {
  Navigator.of(context).push(
    PageRouteBuilder(
      opaque: false,
      barrierColor: Colors.black,
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) => FadeTransition(
        opacity: animation,
        child: _ProfilePhotoViewer(initial: initial),
      ),
    ),
  );
}

class _ProfilePhotoViewer extends StatelessWidget {
  final String initial;

  const _ProfilePhotoViewer({required this.initial});

  @override
  Widget build(BuildContext context) {
    final bytes = AppSession.profileImageBytes;
    return GestureDetector(
      onTap: () => Navigator.of(context).pop(),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            Center(
              child: ClipOval(
                child: bytes != null
                    ? Image.memory(bytes, width: 280, height: 280, fit: BoxFit.cover)
                    : Container(
                        width: 280,
                        height: 280,
                        color: kNavTeal,
                        alignment: Alignment.center,
                        child: Text(
                          initial,
                          style: const TextStyle(color: Colors.white, fontSize: 100, fontWeight: FontWeight.w700),
                        ),
                      ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: SafeArea(
                child: IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _AvatarAction { camera, gallery, remove }

// Opens a bottom sheet to take/choose a profile photo, updates AppSession,
// and calls [onChanged] so the caller can rebuild its avatar.
Future<void> pickProfileImage(BuildContext context, {required VoidCallback onChanged}) async {
  final hasExistingPhoto = AppSession.profileImageBytes != null;
  final action = await showModalBottomSheet<_AvatarAction>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (sheetContext) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 12),
          _SheetOption(
            icon: Icons.photo_camera_outlined,
            label: 'Take photo',
            onTap: () => Navigator.of(sheetContext).pop(_AvatarAction.camera),
          ),
          _SheetOption(
            icon: Icons.photo_library_outlined,
            label: 'Choose from gallery',
            onTap: () => Navigator.of(sheetContext).pop(_AvatarAction.gallery),
          ),
          if (hasExistingPhoto)
            _SheetOption(
              icon: Icons.delete_outline,
              label: 'Remove photo',
              destructive: true,
              onTap: () => Navigator.of(sheetContext).pop(_AvatarAction.remove),
            ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );

  if (action == null) return;

  if (action == _AvatarAction.remove) {
    AppSession.profileImageBytes = null;
    onChanged();
    return;
  }

  final source = action == _AvatarAction.camera ? ImageSource.camera : ImageSource.gallery;
  try {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85, maxWidth: 1200);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    debugPrint('Picked profile photo: ${picked.name} (${bytes.length} bytes, mime: ${picked.mimeType})');
    AppSession.profileImageBytes = bytes;
    onChanged();
  } catch (e) {
    debugPrint('pickProfileImage failed (source: $source): $e');
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(source == ImageSource.camera
          ? "Couldn't access the camera."
          : "Couldn't access the photo library.")),
    );
  }
}

class _SheetOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  const _SheetOption({required this.icon, required this.label, required this.onTap, this.destructive = false});

  @override
  Widget build(BuildContext context) {
    final color = destructive ? Colors.red.shade600 : Colors.black;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: Row(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 16),
            Text(label, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: color)),
          ],
        ),
      ),
    );
  }
}
