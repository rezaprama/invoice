import { emptyItem, type Invoice, type Localized } from './model';

const L = (id: string, en: string): Localized => ({ id, en });
const F = (key: string, id: string, en: string) => ({ key, label: L(id, en) });
const I = (id: string, en: string, unit = 'paket', englishUnit = 'package') => ({ description: L(id, en), unit: L(unit, englishUnit) });
const project = F('project', 'Nama proyek', 'Project name');
const location = F('location', 'Lokasi proyek', 'Project location');
const reference = F('reference', 'Referensi penawaran / kontrak', 'Quote / contract reference');
const period = F('period', 'Periode layanan', 'Service period');
const stage = F('stage', 'Tahap / termin', 'Stage / milestone');
const room = F('room', 'Nomor kamar', 'Room number');
const billingPeriod = F('billingPeriod', 'Periode tagihan', 'Billing period');
const legalRef = F('legalReference', 'Referensi penugasan', 'Engagement reference');
const legalSender = { name: 'Sriyani Suhartati' };
const kostSender = { name: 'Kos Zania', address: 'Tangerang' };

export const categories = {
  built: L('Konstruksi & desain bangunan', 'Construction & building design'),
  property: L('Kos & properti', 'Boarding house & property'),
  legal: L('Jasa hukum', 'Legal services'),
  services: L('Jasa & usaha lainnya', 'Other services & businesses'),
};
export type InvoiceTemplate = {
  id: string; category: keyof typeof categories; name: Localized; title: Localized;
  fields: { key: string; label: Localized }[];
  items: { description: Localized; unit: Localized }[];
  sender?: { name: string; address?: string };
};
export const templates: InvoiceTemplate[] = [
  { id: 'construction_progress', category: 'built', name: L('Konstruksi · termin proyek', 'Construction · progress billing'), title: L('Invoice Konstruksi', 'Construction Invoice'), fields: [project, location, reference, stage],
    items: [I('Mobilisasi & persiapan', 'Mobilization & preparation'), I('Pekerjaan sesuai termin', 'Milestone work'), I('Pekerjaan tambahan', 'Additional work')] },
  { id: 'construction_volume', category: 'built', name: L('Konstruksi · volume pekerjaan', 'Construction · measured quantities'), title: L('Invoice Pekerjaan', 'Works Invoice'), fields: [project, location, reference, F('measurement', 'Referensi pengukuran', 'Measurement reference')],
    items: [I('Pekerjaan tanah', 'Earthworks', 'm³', 'm³'), I('Beton struktur', 'Structural concrete', 'm³', 'm³'), I('Pekerjaan dinding', 'Wall works', 'm²', 'm²'), I('Pekerjaan finishing', 'Finishing works', 'm²', 'm²')] },
  { id: 'civil_consulting', category: 'built', name: L('Konsultan teknik sipil', 'Civil engineering consultancy'), title: L('Invoice Konsultansi', 'Consultancy Invoice'), fields: [project, location, reference, stage],
    items: [I('Survei & pengumpulan data', 'Survey & data collection', 'hari', 'days'), I('Analisis & perhitungan struktur', 'Structural analysis & calculations'), I('Penyusunan laporan teknis', 'Technical report preparation')] },
  { id: 'supervision', category: 'built', name: L('Pengawasan proyek', 'Construction supervision'), title: L('Invoice Pengawasan', 'Supervision Invoice'), fields: [project, location, period, reference],
    items: [I('Kunjungan lapangan', 'Site visit', 'kunjungan', 'visits'), I('Pengawasan & pelaporan', 'Supervision & reporting', 'minggu', 'weeks'), I('Pemeriksaan volume pekerjaan', 'Work quantity review')] },
  { id: 'architecture', category: 'built', name: L('Arsitek · perencanaan', 'Architecture · design services'), title: L('Invoice Arsitektur', 'Architecture Invoice'), fields: [project, location, stage, F('area', 'Luas lingkup desain', 'Design scope area')],
    items: [I('Pengembangan konsep', 'Concept development'), I('Gambar kerja arsitektur', 'Architectural working drawings'), I('Visualisasi 3D', '3D visualization', 'tampilan', 'views')] },
  { id: 'interior_design', category: 'built', name: L('Interior · desain', 'Interior · design'), title: L('Invoice Desain Interior', 'Interior Design Invoice'), fields: [project, location, stage, F('rooms', 'Ruang yang didesain', 'Rooms in scope')],
    items: [I('Survei & pengukuran ruang', 'Room survey & measurement', 'kunjungan', 'visits'), I('Konsep & tata ruang', 'Concept & space planning'), I('Desain detail interior', 'Detailed interior design', 'm²', 'm²'), I('Gambar kerja interior', 'Interior working drawings')] },
  { id: 'interior_build', category: 'built', name: L('Interior · pengadaan & pemasangan', 'Interior · supply & installation'), title: L('Invoice Interior', 'Interior Works Invoice'), fields: [project, location, reference, stage],
    items: [I('Furnitur custom', 'Custom furniture', 'unit', 'units'), I('Material finishing', 'Finishing materials', 'm²', 'm²'), I('Pemasangan & penyelesaian', 'Installation & completion')] },
  { id: 'survey', category: 'built', name: L('Survei & pemetaan', 'Surveying & mapping'), title: L('Invoice Survei', 'Survey Invoice'), fields: [project, location, F('surveyDate', 'Tanggal survei', 'Survey date'), F('surveyArea', 'Area survei', 'Survey area')],
    items: [I('Pengukuran lapangan', 'Field measurement', 'hari', 'days'), I('Pengolahan data & pemetaan', 'Data processing & mapping'), I('Laporan hasil survei', 'Survey report')] },
  { id: 'kost_monthly', category: 'property', name: L('Kos Zania Tangerang · bulanan', 'Kos Zania Tangerang · monthly'), title: L('Tagihan Kos', 'Boarding House Invoice'), sender: kostSender, fields: [room, billingPeriod, F('electricStart', 'Meter listrik awal (opsional)', 'Opening electricity meter (optional)'), F('electricEnd', 'Meter listrik akhir (opsional)', 'Closing electricity meter (optional)')],
    items: [I('Sewa kamar', 'Room rent', 'bulan', 'months'), I('Pemakaian listrik', 'Electricity usage', 'kWh', 'kWh'), I('Air & layanan', 'Water & services', 'bulan', 'months')] },
  { id: 'kost_movein', category: 'property', name: L('Kos Zania Tangerang · masuk / deposit', 'Kos Zania Tangerang · move-in / deposit'), title: L('Tagihan Masuk Kos', 'Boarding House Move-in Invoice'), sender: kostSender, fields: [room, F('moveIn', 'Tanggal masuk', 'Move-in date'), billingPeriod, F('booking', 'Referensi pemesanan', 'Booking reference')],
    items: [I('Sewa kamar pertama', 'Initial room rent', 'bulan', 'months'), I('Deposit jaminan', 'Security deposit', 'deposit', 'deposit'), I('Administrasi (opsional)', 'Administration (optional)')] },
  { id: 'kost_yearly', category: 'property', name: L('Kos Zania Tangerang · tahunan', 'Kos Zania Tangerang · annual'), title: L('Tagihan Sewa Tahunan', 'Annual Rent Invoice'), sender: kostSender, fields: [room, F('leaseStart', 'Awal sewa', 'Lease start'), F('leaseEnd', 'Akhir sewa', 'Lease end'), reference],
    items: [I('Sewa kamar tahunan', 'Annual room rent', 'tahun', 'years'), I('Fasilitas tambahan (opsional)', 'Additional facilities (optional)')] },
  { id: 'legal_consultation', category: 'legal', name: L('Sriyani Suhartati · konsultasi hukum', 'Sriyani Suhartati · legal consultation'), title: L('Invoice Jasa Hukum', 'Legal Services Invoice'), sender: legalSender, fields: [legalRef, period, F('serviceScope', 'Lingkup layanan', 'Service scope')],
    items: [I('Konsultasi hukum', 'Legal consultation', 'jam', 'hours'), I('Telaah dokumen', 'Document review', 'dokumen', 'documents'), I('Penyusunan pendapat hukum', 'Legal opinion preparation')] },
  { id: 'legal_assistance', category: 'legal', name: L('Sriyani Suhartati · pendampingan', 'Sriyani Suhartati · legal assistance'), title: L('Invoice Pendampingan', 'Legal Assistance Invoice'), sender: legalSender, fields: [legalRef, period, F('caseRef', 'Referensi perkara (opsional)', 'Matter reference (optional)')],
    items: [I('Jasa pendampingan', 'Professional assistance'), I('Penyusunan berkas', 'Document preparation', 'dokumen', 'documents'), I('Transportasi & administrasi', 'Travel & administration')] },
  { id: 'legal_retainer', category: 'legal', name: L('Sriyani Suhartati · retainer', 'Sriyani Suhartati · retainer'), title: L('Invoice Retainer Hukum', 'Legal Retainer Invoice'), sender: legalSender, fields: [legalRef, period, F('serviceScope', 'Lingkup layanan', 'Service scope')],
    items: [I('Jasa retainer bulanan', 'Monthly retainer', 'bulan', 'months'), I('Konsultasi tambahan', 'Additional consultation', 'jam', 'hours'), I('Telaah dokumen tambahan', 'Additional document review', 'dokumen', 'documents')] },
  { id: 'property_rent', category: 'property', name: L('Sewa properti', 'Property rental'), title: L('Invoice Sewa Properti', 'Property Rental Invoice'), fields: [F('property', 'Nama / unit properti', 'Property / unit'), location, billingPeriod, reference],
    items: [I('Sewa properti', 'Property rent', 'bulan', 'months'), I('Biaya layanan', 'Service charges', 'bulan', 'months'), I('Utilitas', 'Utilities')] },
  { id: 'maintenance', category: 'services', name: L('Perawatan bangunan', 'Building maintenance'), title: L('Invoice Perawatan', 'Maintenance Invoice'), fields: [F('property', 'Bangunan / unit', 'Building / unit'), location, period, F('workOrder', 'Nomor pekerjaan', 'Work order')],
    items: [I('Jasa pemeriksaan', 'Inspection service', 'kunjungan', 'visits'), I('Perbaikan & perawatan', 'Repair & maintenance'), I('Material / suku cadang', 'Materials / spare parts', 'unit', 'units')] },
  { id: 'software', category: 'services', name: L('Pengembangan perangkat lunak', 'Software development'), title: L('Invoice Pengembangan', 'Development Invoice'), fields: [project, stage, period, reference],
    items: [I('Analisis kebutuhan', 'Requirements analysis'), I('Pengembangan & integrasi', 'Development & integration'), I('Pengujian & peluncuran', 'Testing & launch')] },
  { id: 'creative', category: 'services', name: L('Desain grafis & kreatif', 'Graphic & creative design'), title: L('Invoice Desain', 'Design Invoice'), fields: [project, stage, F('deliverables', 'Hasil yang dikerjakan', 'Deliverables'), reference],
    items: [I('Riset & konsep kreatif', 'Creative research & concept'), I('Produksi desain', 'Design production', 'desain', 'designs'), I('Finalisasi & penyerahan', 'Finalization & handover')] },
  { id: 'training', category: 'services', name: L('Pelatihan & lokakarya', 'Training & workshops'), title: L('Invoice Pelatihan', 'Training Invoice'), fields: [F('training', 'Nama pelatihan', 'Training name'), F('eventDate', 'Tanggal pelaksanaan', 'Event date'), location, F('participants', 'Jumlah peserta', 'Participant count')],
    items: [I('Sesi pelatihan', 'Training session', 'sesi', 'sessions'), I('Penyusunan materi', 'Training material preparation'), I('Pendampingan lanjutan', 'Follow-up support', 'jam', 'hours')] },
  { id: 'general', category: 'services', name: L('Jasa profesional umum', 'General professional services'), title: L('Invoice', 'Invoice'), fields: [project, period, reference],
    items: [I('Jasa profesional', 'Professional services'), I('Biaya operasional (opsional)', 'Operating expenses (optional)')] },
];

export function applyFormat(invoice: Invoice, template: InvoiceTemplate, replaceItems: boolean): Invoice {
  const previous = templates.find(entry => entry.id === invoice.formatId);
  const titleIsAutomatic = !invoice.title.trim() || invoice.title === 'Invoice' || (previous && Object.values(previous.title).includes(invoice.title));
  const sender = { ...invoice.sender };
  if (!sender.name.trim() || sender.name === previous?.sender?.name) sender.name = template.sender?.name || '';
  if (!sender.address.trim() || sender.address === previous?.sender?.address) sender.address = template.sender?.address || '';
  const details = template.fields.map(field => {
    const existing = invoice.details.find(detail => detail.key === field.key);
    const oldDefault = previous?.fields.find(detail => detail.key === field.key);
    const customLabel = existing && (!oldDefault || existing.label.id !== oldDefault.label.id || existing.label.en !== oldDefault.label.en);
    return { key: field.key, label: { ...(customLabel ? existing.label : field.label) }, value: existing?.value || '' };
  });
  const additional = invoice.details.filter(detail => detail.value.trim() && !details.some(field => field.key === detail.key));
  return { ...invoice, formatId: template.id, title: titleIsAutomatic ? template.title[invoice.language] : invoice.title, sender,
    details: [...details, ...additional],
    items: replaceItems ? template.items.map(item => ({ ...emptyItem(), description: item.description[invoice.language], unit: item.unit[invoice.language] })) : invoice.items,
  };
}
