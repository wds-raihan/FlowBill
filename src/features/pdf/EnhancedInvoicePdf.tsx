import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Font,
  Svg,
  G,
  Path,
} from "@react-pdf/renderer";
import { format } from "date-fns";

// Register fonts for better typography
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 'bold' },
  ]
});

interface EnhancedInvoicePDFProps {
  invoice: {
    _id: string;
    invoiceNo: string;
    issueDate: Date;
    dueDate: Date;
    items: Array<{
      description: string;
      pageQty: number;
      serviceCharge: number;
      rate: number;
      amount: number;
    }>;
    subTotal: number;
    tax: number;
    discount: number;
    total: number;
    notes?: string;
    status: string;
  };
  customer: {
    name: string;
    email: string;
    phone?: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    taxId?: string;
  };
  organization: {
    name: string;
    logoUrl?: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    contact: {
      email: string;
      phone?: string;
      website?: string;
    };
    taxId?: string;
    settings?: {
      theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
      };
    };
  };
}

const createStyles = (primaryColor = "#3B82F6", secondaryColor = "#1E40AF") => StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 80,
    color: "#f8f9fa",
    opacity: 0.1,
    zIndex: -1,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: primaryColor,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  companyInfo: {
    flex: 1,
    paddingRight: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: primaryColor,
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 10,
    color: "#6B7280",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  invoiceInfo: {
    alignItems: "flex-end",
    minWidth: 200,
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: secondaryColor,
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 5,
  },
  invoiceDetails: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 3,
    textAlign: "right",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "bold",
    padding: 6,
    borderRadius: 4,
    textAlign: "center",
    marginBottom: 10,
    minWidth: 80,
  },
  statusDraft: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },
  statusSent: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
  },
  statusPaid: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },
  statusOverdue: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
  },
  billingSection: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 40,
  },
  billingColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: primaryColor,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 10,
    color: "#6B7280",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  tableContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: primaryColor,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRowEven: {
    backgroundColor: "#F9FAFB",
  },
  tableCell: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.4,
  },
  descriptionCell: {
    flex: 3,
    paddingRight: 10,
  },
  quantityCell: {
    flex: 1,
    textAlign: "center",
  },
  rateCell: {
    flex: 1,
    textAlign: "right",
  },
  amountCell: {
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
  },
  serviceChargeText: {
    fontSize: 8,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 2,
  },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  totalsContainer: {
    width: 250,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  totalValue: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: primaryColor,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: primaryColor,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: primaryColor,
  },
  notesSection: {
    marginTop: 30,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: primaryColor,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: primaryColor,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    fontSize: 8,
    color: "#9CA3AF",
  },
  paymentTerms: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  paymentTermsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#92400E",
    marginBottom: 4,
  },
  paymentTermsText: {
    fontSize: 9,
    color: "#92400E",
    lineHeight: 1.4,
  },
});

// Watermark component
const Watermark = ({ text, color = "#f8f9fa" }: { text: string; color?: string }) => (
  <View style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    zIndex: -1,
  }}>
    <Text style={{
      fontSize: 80,
      color: color,
      opacity: 0.08,
      fontWeight: "bold",
    }}>
      {text}
    </Text>
  </View>
);

export function EnhancedInvoicePDF({
  invoice,
  customer,
  organization,
}: EnhancedInvoicePDFProps) {
  const primaryColor = organization.settings?.theme?.primaryColor || "#3B82F6";
  const secondaryColor = organization.settings?.theme?.secondaryColor || "#1E40AF";
  const styles = createStyles(primaryColor, secondaryColor);

  const serviceCharges = invoice.items.reduce(
    (sum, item) => sum + item.serviceCharge,
    0
  );

  const getStatusStyle = () => {
    switch (invoice.status) {
      case "draft":
        return styles.statusDraft;
      case "sent":
        return styles.statusSent;
      case "paid":
        return styles.statusPaid;
      case "overdue":
        return styles.statusOverdue;
      default:
        return styles.statusDraft;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isOverdue = () => {
    return invoice.status !== "paid" && new Date(invoice.dueDate) < new Date();
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Watermark text={organization.name} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {organization.logoUrl && (
              <Image style={styles.logo} src={organization.logoUrl} />
            )}
            <Text style={styles.companyName}>{organization.name}</Text>
            {organization.address.street && (
              <Text style={styles.companyAddress}>
                {organization.address.street}
              </Text>
            )}
            <Text style={styles.companyAddress}>
              {[
                organization.address.city,
                organization.address.state,
                organization.address.zipCode
              ].filter(Boolean).join(", ")}
            </Text>
            {organization.address.country && (
              <Text style={styles.companyAddress}>
                {organization.address.country}
              </Text>
            )}
            <Text style={styles.companyContact}>
              {organization.contact.email}
            </Text>
            {organization.contact.phone && (
              <Text style={styles.companyContact}>
                {organization.contact.phone}
              </Text>
            )}
            {organization.contact.website && (
              <Text style={styles.companyContact}>
                {organization.contact.website}
              </Text>
            )}
          </View>

          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={[styles.statusBadge, getStatusStyle()]}>
              {invoice.status.toUpperCase()}
            </Text>
            <Text style={styles.invoiceNumber}>
              {invoice.invoiceNo}
            </Text>
            <Text style={styles.invoiceDetails}>
              Issue Date: {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
            </Text>
            <Text style={[styles.invoiceDetails, isOverdue() && { color: "#B91C1C", fontWeight: "bold" }]}>
              Due Date: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
              {isOverdue() && " (OVERDUE)"}
            </Text>
          </View>
        </View>

        {/* Billing Information */}
        <View style={styles.billingSection}>
          <View style={styles.billingColumn}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerDetails}>{customer.email}</Text>
            {customer.phone && (
              <Text style={styles.customerDetails}>{customer.phone}</Text>
            )}
            {customer.address.street && (
              <Text style={styles.customerDetails}>
                {customer.address.street}
              </Text>
            )}
            <Text style={styles.customerDetails}>
              {[
                customer.address.city,
                customer.address.state,
                customer.address.zipCode
              ].filter(Boolean).join(", ")}
            </Text>
            {customer.address.country && (
              <Text style={styles.customerDetails}>
                {customer.address.country}
              </Text>
            )}
            {customer.taxId && (
              <Text style={styles.customerDetails}>
                Tax ID: {customer.taxId}
              </Text>
            )}
          </View>

          <View style={styles.billingColumn}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <Text style={styles.customerDetails}>
              <Text style={{ fontWeight: "bold" }}>Amount Due: </Text>
              <Text style={{ color: primaryColor, fontWeight: "bold", fontSize: 12 }}>
                {formatCurrency(invoice.total)}
              </Text>
            </Text>
            <Text style={styles.customerDetails}>
              <Text style={{ fontWeight: "bold" }}>Payment Terms: </Text>
              Net 30 days
            </Text>
            {organization.taxId && (
              <Text style={styles.customerDetails}>
                <Text style={{ fontWeight: "bold" }}>Our Tax ID: </Text>
                {organization.taxId}
              </Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.descriptionCell]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.quantityCell]}>
              Qty
            </Text>
            <Text style={[styles.tableHeaderText, styles.rateCell]}>
              Rate
            </Text>
            <Text style={[styles.tableHeaderText, styles.amountCell]}>
              Amount
            </Text>
          </View>

          {invoice.items.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow, 
                index % 2 === 1 && styles.tableRowEven
              ]}
            >
              <View style={styles.descriptionCell}>
                <Text style={[styles.tableCell, { fontWeight: "bold" }]}>
                  {item.description}
                </Text>
                {item.serviceCharge > 0 && (
                  <Text style={styles.serviceChargeText}>
                    Includes service charge: {formatCurrency(item.serviceCharge)}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.quantityCell]}>
                {item.pageQty}
              </Text>
              <Text style={[styles.tableCell, styles.rateCell]}>
                {formatCurrency(item.rate)}
              </Text>
              <Text style={[styles.tableCell, styles.amountCell]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(invoice.subTotal)}
              </Text>
            </View>

            {serviceCharges > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Service Charges:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(serviceCharges)}
                </Text>
              </View>
            )}

            {invoice.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(invoice.tax)}
                </Text>
              </View>
            )}

            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: "#059669" }]}>Discount:</Text>
                <Text style={[styles.totalValue, { color: "#059669" }]}>
                  -{formatCurrency(invoice.discount)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
              <Text style={styles.grandTotalValue}>
                {formatCurrency(invoice.total)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Terms */}
        {invoice.status !== "paid" && (
          <View style={styles.paymentTerms}>
            <Text style={styles.paymentTermsTitle}>Payment Terms & Conditions</Text>
            <Text style={styles.paymentTermsText}>
              Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly service charge. 
              Please include the invoice number with your payment.
            </Text>
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated on {format(new Date(), "MMM dd, yyyy 'at' h:mm a")}
          </Text>
          <Text style={styles.footerText}>
            Invoice #{invoice.invoiceNo} • Page 1 of 1
          </Text>
        </View>
      </Page>
    </Document>
  );
}