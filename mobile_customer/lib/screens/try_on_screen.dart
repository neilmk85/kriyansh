import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../data/style_gallery.dart';
import '../services/openai_image_service.dart';
import '../services/replicate_service.dart';
import '../theme/colors.dart';

enum _AiProvider { openai, replicate }

class TryOnScreen extends StatefulWidget {
  const TryOnScreen({super.key});

  @override
  State<TryOnScreen> createState() => _TryOnScreenState();
}

class _TryOnScreenState extends State<TryOnScreen> {
  File?          _selfie;
  StyleItem?     _selectedStyle;
  Uint8List?     _resultBytes;
  bool           _loading = false;
  String?        _error;
  String         _activeCategory = 'Lash Styles';
  _AiProvider    _provider = _AiProvider.openai;

  final _picker = ImagePicker();

  Future<void> _pickSelfie(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 90,
        maxWidth: 1024,
        preferredCameraDevice: CameraDevice.front,
      );
      if (picked != null) {
        setState(() {
          _selfie      = File(picked.path);
          _resultBytes = null;
          _error       = null;
        });
      }
    } catch (e) {
      setState(() => _error = 'Could not access camera: $e');
    }
  }

  Future<void> _generate() async {
    if (_selfie == null || _selectedStyle == null) return;
    setState(() { _loading = true; _error = null; _resultBytes = null; });
    try {
      final bytes = _provider == _AiProvider.openai
          ? await OpenAIImageService.tryOnStyle(
              selfie:      _selfie!,
              styleName:   _selectedStyle!.name,
              stylePrompt: _selectedStyle!.prompt,
            )
          : await ReplicateService.tryOnStyle(
              selfie:      _selfie!,
              styleName:   _selectedStyle!.name,
              stylePrompt: _selectedStyle!.prompt,
            );
      setState(() => _resultBytes = bytes);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSelfieOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4,
                decoration: BoxDecoration(color: kDim, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            Text('Add Your Photo',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: kInk)),
            const SizedBox(height: 6),
            Text('Take a selfie or choose from your gallery',
                style: GoogleFonts.inter(fontSize: 13, color: kSub)),
            const SizedBox(height: 24),
            Row(children: [
              Expanded(child: _SourceButton(
                icon: Icons.camera_alt_outlined,
                label: 'Take Selfie',
                onTap: () { Navigator.pop(context); _pickSelfie(ImageSource.camera); },
              )),
              const SizedBox(width: 12),
              Expanded(child: _SourceButton(
                icon: Icons.photo_library_outlined,
                label: 'From Gallery',
                onTap: () { Navigator.pop(context); _pickSelfie(ImageSource.gallery); },
              )),
            ]),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Try On a Look',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black)),
        actions: [
          _ProviderToggle(
            value: _provider,
            onChanged: (p) => setState(() {
              _provider    = p;
              _resultBytes = null;
              _error       = null;
            }),
          ),
          if (_selfie != null)
            TextButton(
              onPressed: _showSelfieOptions,
              child: Text('Change Photo',
                  style: GoogleFonts.inter(fontSize: 13, color: kTeal, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: Column(
        children: [
          _buildPhotoArea(),
          Container(height: 1, color: kBorder),
          _buildCategoryTabs(),
          Expanded(child: _buildStyleGrid()),
          _buildCTABar(),
        ],
      ),
    );
  }

  // ── Photo area: selfie  ✨  AI result ─────────────────────────────────────
  Widget _buildPhotoArea() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Row(
        children: [
          // Selfie panel
          Expanded(
            child: GestureDetector(
              onTap: _selfie == null ? _showSelfieOptions : null,
              child: _photoPanel(
                child: _selfie == null
                    ? _placeholder(Icons.add_a_photo_outlined, 'Your\nPhoto')
                    : Stack(fit: StackFit.expand, children: [
                        Image.file(_selfie!, fit: BoxFit.cover),
                        _label('You'),
                      ]),
                hasBorder: _selfie != null,
              ),
            ),
          ).animate().fadeIn(),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Icon(Icons.auto_awesome, color: kTeal, size: 20),
          ),

          // Result panel
          Expanded(
            child: _photoPanel(
              child: _loading
                  ? _loadingState()
                  : _resultBytes != null
                      ? Stack(fit: StackFit.expand, children: [
                          Image.memory(_resultBytes!, fit: BoxFit.cover),
                          _label('AI Preview', color: kTeal),
                        ])
                      : _placeholder(Icons.auto_awesome_outlined, 'AI\nPreview'),
              hasBorder: _resultBytes != null,
            ),
          ).animate().fadeIn(delay: 80.ms),
        ],
      ),
    );
  }

  Widget _photoPanel({required Widget child, bool hasBorder = false}) {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        color: kBorder,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasBorder ? kTeal : kBorderMd,
          width: hasBorder ? 2 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }

  Widget _placeholder(IconData icon, String text) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Icon(icon, color: kDim, size: 30),
      const SizedBox(height: 8),
      Text(text, textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 13, color: kDim, fontWeight: FontWeight.w500)),
    ],
  );

  Widget _label(String text, {Color color = Colors.black}) => Positioned(
    bottom: 8, left: 8,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.75),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text,
          style: GoogleFonts.inter(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700)),
    ),
  );

  Widget _loadingState() => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      const SizedBox(width: 28, height: 28,
          child: CircularProgressIndicator(color: kTeal, strokeWidth: 2.5)),
      const SizedBox(height: 12),
      Text('Generating…', style: GoogleFonts.inter(fontSize: 12, color: kSub)),
      Text(
        _provider == _AiProvider.openai ? '~20 seconds' : '~10–30 seconds',
        style: GoogleFonts.inter(fontSize: 11, color: kDim),
      ),
    ],
  );

  // ── Category tabs ─────────────────────────────────────────────────────────
  Widget _buildCategoryTabs() {
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: kStyleCategories.length,
        itemBuilder: (_, i) {
          final cat    = kStyleCategories[i];
          final active = _activeCategory == cat.name;
          return GestureDetector(
            onTap: () => setState(() => _activeCategory = cat.name),
            child: Container(
              margin: const EdgeInsets.only(right: 8, top: 6, bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: active ? Colors.black : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? Colors.black : kBorderMd),
              ),
              alignment: Alignment.center,
              child: Text(
                '${cat.emoji} ${cat.name}',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : kSub,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ── Style grid ────────────────────────────────────────────────────────────
  Widget _buildStyleGrid() {
    final styles = kStyleCategories
        .firstWhere((c) => c.name == _activeCategory)
        .styles;

    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.72,
      ),
      itemCount: styles.length,
      itemBuilder: (_, i) {
        final style    = styles[i];
        final selected = _selectedStyle?.id == style.id;

        return GestureDetector(
          onTap: () => setState(() {
            _selectedStyle = style;
            _resultBytes   = null;
            _error         = null;
          }),
          child: AnimatedContainer(
            duration: 180.ms,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected ? kTeal : Colors.transparent,
                width: 2.5,
              ),
              boxShadow: selected
                  ? [BoxShadow(color: kTeal.withValues(alpha: 0.25), blurRadius: 8)]
                  : [],
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  style.imageUrl,
                  fit: BoxFit.cover,
                  loadingBuilder: (_, child, progress) => progress == null
                      ? child
                      : Container(color: kBorder,
                          child: const Center(
                              child: CircularProgressIndicator(color: kTeal, strokeWidth: 1.5))),
                  errorBuilder: (ctx, err, st) => Container(
                    color: kBorder,
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.image_outlined, color: kDim, size: 22),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Text(style.name, textAlign: TextAlign.center,
                            style: GoogleFonts.inter(fontSize: 10, color: kDim)),
                      ),
                    ]),
                  ),
                ),
                // Gradient
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.65)],
                        stops: const [0.5, 1.0],
                      ),
                    ),
                  ),
                ),
                // Name
                Positioned(left: 6, right: 6, bottom: 6,
                  child: Text(style.name,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    style: GoogleFonts.inter(
                        fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
                // Selected tick
                if (selected)
                  Positioned(top: 6, right: 6,
                    child: Container(
                      width: 22, height: 22,
                      decoration: const BoxDecoration(color: kTeal, shape: BoxShape.circle),
                      child: const Icon(Icons.check, color: Colors.white, size: 14),
                    ),
                  ),
              ],
            ),
          ).animate().fadeIn(delay: (i * 30).ms),
        );
      },
    );
  }

  // ── CTA bar ───────────────────────────────────────────────────────────────
  Widget _buildCTABar() {
    final canGenerate = _selfie != null && _selectedStyle != null && !_loading;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 36),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: kBorder)),
      ),
      child: Column(
        children: [
          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                  color: kRedBg, borderRadius: BorderRadius.circular(10)),
              child: Row(children: [
                const Icon(Icons.error_outline, color: kRed, size: 16),
                const SizedBox(width: 8),
                Expanded(child: Text(_error!,
                    style: GoogleFonts.inter(fontSize: 12, color: kRed))),
              ]),
            ),

          if (_selfie == null)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _showSelfieOptions,
                icon: const Icon(Icons.camera_alt_outlined, size: 18),
                label: const Text('Add Your Photo to Start'),
              ),
            )
          else if (_selectedStyle == null)
            Text('Choose a style above to try it on',
                style: GoogleFonts.inter(fontSize: 13, color: kSub))
          else
            Row(children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: canGenerate ? _generate : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kTeal,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: _loading
                      ? const SizedBox(width: 18, height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _resultBytes != null ? 'Try Another Style ✨' : 'Try This Look ✨',
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.w700, color: Colors.white, fontSize: 14),
                        ),
                ),
              ),
              if (_resultBytes != null) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text('Book This Look',
                        style: GoogleFonts.inter(
                            fontWeight: FontWeight.w700, color: Colors.white, fontSize: 14)),
                  ),
                ),
              ],
            ]),

          const SizedBox(height: 6),
          Text(
            _provider == _AiProvider.openai
                ? 'AI preview · Powered by OpenAI gpt-image-1'
                : 'AI preview · Powered by FLUX Kontext Pro (Replicate)',
            style: GoogleFonts.inter(fontSize: 10, color: kDim),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ── AI Provider toggle ────────────────────────────────────────────────────────
class _ProviderToggle extends StatelessWidget {
  final _AiProvider value;
  final ValueChanged<_AiProvider> onChanged;
  const _ProviderToggle({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Container(
        height: 32,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _pill('OpenAI',    _AiProvider.openai,    const Color(0xFF10A37F)),
            _pill('Replicate', _AiProvider.replicate, const Color(0xFF6366F1)),
          ],
        ),
      ),
    );
  }

  Widget _pill(String label, _AiProvider p, Color activeColor) {
    final active = value == p;
    return GestureDetector(
      onTap: active ? null : () => onChanged(p),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: active ? activeColor : Colors.transparent,
          borderRadius: BorderRadius.circular(17),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: active ? Colors.white : kSub,
          ),
        ),
      ),
    );
  }
}

class _SourceButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SourceButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(16)),
        child: Column(children: [
          Icon(icon, size: 28, color: kInk),
          const SizedBox(height: 8),
          Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: kInk)),
        ]),
      ),
    );
  }
}
