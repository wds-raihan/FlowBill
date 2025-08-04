import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { format } from "date-fns";

interface InvoicePDFProps {
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
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    taxId?: string;
  };
  organization: {
    name: string;
    logoUrl?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    contact: {
      email: string;
      phone: string;
      website?: string;
    };
    taxId: string;
  };
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },
  logo: {
    width: 74,
    height: 74,
    marginBottom: 10,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  companyInfo: {
    width: "60%",
  },
  invoiceInfo: {
    width: "40%",
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 10,
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 10,
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  invoiceDetails: {
    fontSize: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
  },
  customerInfo: {
    marginBottom: 20,
  },
  tableContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCellHeader: {
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
  },
  tableCell: {
    padding: 8,
    fontSize: 10,
  },
  descriptionCell: {
    width: "40%",
  },
  pagesCell: {
    width: "15%",
    textAlign: "right",
  },
  rateCell: {
    width: "15%",
    textAlign: "right",
  },
  amountCell: {
    width: "15%",
    textAlign: "right",
  },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  totalsColumn: {
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
  },
  notesSection: {
    marginTop: 20,
  },
  notesText: {
    fontSize: 10,
  },
  statusBadge: {
    fontSize: 10,
    padding: 4,
    borderRadius: 4,
    textAlign: "center",
    marginBottom: 10,
  },
  statusDraft: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
  },
  statusSent: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusOverdue: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
});

export function InvoicePDF({
  invoice,
  customer,
  organization,
}: InvoicePDFProps) {
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.companyInfo}>
            {organization.logoUrl && (
              <Image style={styles.logo} src={organization.logoUrl} />
            )}
            <Text style={styles.companyName}>{organization.name}</Text>
            <Text style={styles.companyAddress}>
              {organization.address.street}, {organization.address.city},{" "}
              {organization.address.state} {organization.address.zipCode},{" "}
              {organization.address.country}
            </Text>
            <Text style={styles.companyContact}>
              {organization.contact.email} | {organization.contact.phone}
            </Text>
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
            <Text style={styles.invoiceDetails}>
              <Text style={{ fontWeight: "bold" }}>Invoice #:</Text>{" "}
              {invoice.invoiceNo}
            </Text>
            <Text style={styles.invoiceDetails}>
              <Text style={{ fontWeight: "bold" }}>Date:</Text>{" "}
              {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
            </Text>
            <Text style={styles.invoiceDetails}>
              <Text style={{ fontWeight: "bold" }}>Due:</Text>{" "}
              {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
            </Text>
          </View>
        </View>

        {/* Bill To and Pay To */}
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          <View style={{ width: "50%", paddingRight: 10 }}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
              {customer.name}
            </Text>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>
              {customer.email}
            </Text>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>
              {customer.address.street}, {customer.address.city},{" "}
              {customer.address.state} {customer.address.zipCode},{" "}
              {customer.address.country}
            </Text>
            {customer.taxId && (
              <Text style={{ fontSize: 10 }}>Tax ID: {customer.taxId}</Text>
            )}
          </View>
          <View style={{ width: "50%", paddingLeft: 10 }}>
            <Text style={styles.sectionTitle}>Pay To:</Text>
            <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
              {organization.name}
            </Text>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>
              {organization.address.street}, {organization.address.city},{" "}
              {organization.address.state} {organization.address.zipCode},{" "}
              {organization.address.country}
            </Text>
            <Text style={{ fontSize: 10 }}>Tax ID: {organization.taxId}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.descriptionCell]}>
              Description
            </Text>
            <Text style={[styles.tableCellHeader, styles.pagesCell]}>
              Pages
            </Text>
            <Text style={[styles.tableCellHeader, styles.rateCell]}>Rate</Text>
            <Text style={[styles.tableCellHeader, styles.amountCell]}>
              Amount
            </Text>
          </View>

          {invoice.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.descriptionCell]}>
                <Text>{item.description}</Text>
                {item.serviceCharge > 0 && (
                  <Text style={{ fontSize: 9, color: "#666" }}>
                    Service Charge: ${item.serviceCharge.toFixed(2)}
                  </Text>
                )}
              </View>
              <Text style={[styles.tableCell, styles.pagesCell]}>
                {item.pageQty}
              </Text>
              <Text style={[styles.tableCell, styles.rateCell]}>
                ${item.rate.toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, styles.amountCell]}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsColumn}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>
                ${invoice.subTotal.toFixed(2)}
              </Text>
            </View>

            {serviceCharges > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Service Charges:</Text>
                <Text style={styles.totalValue}>
                  ${serviceCharges.toFixed(2)}
                </Text>
              </View>
            )}

            {invoice.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>${invoice.tax.toFixed(2)}</Text>
              </View>
            )}

            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={styles.totalValue}>
                  -${invoice.discount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalValue}>
                ${invoice.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
