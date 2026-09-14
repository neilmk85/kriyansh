import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/services_catalog.dart';
import '../widgets/floating_bottom_nav.dart';

// Result returned when the user adds a service: the chosen option, or null
// for a plain service with no options.
class ServiceDetailResult {
  final ServiceOption? option;
  const ServiceDetailResult(this.option);
}

Future<ServiceDetailResult?> showServiceDetailSheet(
  BuildContext context, {
  required ServiceListing service,
  ServiceOption? initialOption,
}) {
  return showModalBottomSheet<ServiceDetailResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: _ServiceDetailSheet(service: service, initialOption: initialOption),
    ),
  );
}

class _ServiceDetailSheet extends StatefulWidget {
  final ServiceListing service;
  final ServiceOption? initialOption;

  const _ServiceDetailSheet({required this.service, this.initialOption});

  @override
  State<_ServiceDetailSheet> createState() => _ServiceDetailSheetState();
}

class _ServiceDetailSheetState extends State<_ServiceDetailSheet> {
  ServiceOption? _selectedOption;

  @override
  void initState() {
    super.initState();
    _selectedOption = widget.initialOption;
  }

  bool get _canAdd => !widget.service.hasOptions || _selectedOption != null;

  @override
  Widget build(BuildContext context) {
    final service = widget.service;

    return SafeArea(
      top: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    service.name,
                    style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.black),
                  ),
                ),
                IconButton(
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, color: Colors.black, size: 24),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: service.hasOptions ? _buildOptionsList(service) : _buildDescription(service),
          ),
          Divider(color: Colors.grey.shade200, height: 1),
          _buildBottomBar(service),
        ],
      ),
    );
  }

  Widget _buildOptionsList(ServiceListing service) {
    return RadioGroup<ServiceOption>(
      groupValue: _selectedOption,
      onChanged: (value) => setState(() => _selectedOption = value),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        children: [
          Text(
            'Select an option',
            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
          ),
          const SizedBox(height: 2),
          Text(
            'Required',
            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500),
          ),
          const SizedBox(height: 8),
          Divider(color: Colors.grey.shade200, height: 1),
          for (final option in service.options!) ...[
            InkWell(
              onTap: () => setState(() => _selectedOption = option),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            option.label,
                            style: GoogleFonts.inter(fontSize: 16, color: Colors.black),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            option.duration,
                            style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            option.price,
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.black),
                          ),
                        ],
                      ),
                    ),
                    Radio<ServiceOption>(value: option, activeColor: kNavIndigo),
                  ],
                ),
              ),
            ),
            Divider(color: Colors.grey.shade200, height: 1),
          ],
        ],
      ),
    );
  }

  Widget _buildDescription(ServiceListing service) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Time: ${service.duration}',
            style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 16),
          Text(
            'Professional ${service.name.toLowerCase()} service at Kriyansh Beauty Bar.',
            style: GoogleFonts.inter(fontSize: 15, color: Colors.black, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(ServiceListing service) {
    final String priceLabel;
    final String durationLabel;
    if (_selectedOption != null) {
      priceLabel = _selectedOption!.price;
      durationLabel = _selectedOption!.duration;
    } else if (service.hasOptions) {
      final prices = service.options!.map((o) => parsePrice(o.price)).toList()..sort();
      final minutes = service.options!.map((o) => parseDurationMinutes(o.duration)).toList()..sort();
      priceLabel = 'from \$${prices.first}';
      durationLabel = minutes.first == minutes.last
          ? formatMinutes(minutes.first)
          : '${formatMinutes(minutes.first)} - ${formatMinutes(minutes.last)}';
    } else {
      priceLabel = service.price;
      durationLabel = service.duration;
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 14, 24, 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  priceLabel,
                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.black),
                ),
                const SizedBox(height: 2),
                Text(
                  durationLabel,
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _canAdd
                ? () => Navigator.of(context).pop(ServiceDetailResult(_selectedOption))
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.black,
              foregroundColor: Colors.white,
              disabledBackgroundColor: Colors.grey.shade400,
              disabledForegroundColor: Colors.white,
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              elevation: 0,
            ),
            child: Text('Add', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
