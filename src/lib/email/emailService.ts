import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { EnhancedInvoicePDF } from "@/features/pdf/EnhancedInvoicePdf";
import { generatePDFToken } from "@/app/api/invoices/[id]/pdf/route";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface InvoiceEmailData {
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

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.EMAIL_SERVER_HOST!,
      port: parseInt(process.env.EMAIL_SERVER_PORT!),
      secure: process.env.EMAIL_SERVER_PORT === "465",
      auth: {
        user: process.env.EMAIL_SERVER_USER!,
        pass: process.env.EMAIL_SERVER_PASSWORD!,
      },
    };

    this.transporter = nodemailer.createTransporter(config);
  }

  private async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }

  private generateInvoiceEmailHTML(data: InvoiceEmailData): string {
    const { invoice, customer, organization } = data;
    const primaryColor = organization.settings?.theme?.primaryColor || "#3B82F6";
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const formatDate = (date: Date) => 
      new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date);

    const isOverdue = invoice.status !== "paid" && new Date(invoice.dueDate) < new Date();

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNo}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #374151;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9fafb;
            }
            .container {
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, ${primaryColor} 0%, ${organization.settings?.theme?.secondaryColor || "#1E40AF"} 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .header p {
                margin: 8px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                padding: 30px;
            }
            .invoice-details {
                background-color: #f8fafc;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid ${primaryColor};
            }
            .invoice-details h3 {
                margin: 0 0 15px 0;
                color: ${primaryColor};
                font-size: 18px;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 4px 0;
            }
            .detail-label {
                font-weight: 600;
                color: #6b7280;
            }
            .detail-value {
                font-weight: 700;
                color: #111827;
            }
            .amount-due {
                font-size: 24px;
                color: ${primaryColor};
            }
            .overdue {
                color: #dc2626;
                font-weight: 700;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, ${primaryColor} 0%, ${organization.settings?.theme?.secondaryColor || "#1E40AF"} 100%);
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
            }
            .button:hover {
                opacity: 0.9;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .items-table th {
                background-color: ${primaryColor};
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 14px;
            }
            .items-table td {
                padding: 12px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 14px;
            }
            .items-table tr:nth-child(even) {
                background-color: #f9fafb;
            }
            .footer {
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            .footer p {
                margin: 5px 0;
                font-size: 14px;
                color: #6b7280;
            }
            .company-info {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
            }
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .content {
                    padding: 20px;
                }
                .detail-row {
                    flex-direction: column;
                    gap: 4px;
                }
                .items-table {
                    font-size: 12px;
                }
                .items-table th,
                .items-table td {
                    padding: 8px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Invoice ${invoice.invoiceNo}</h1>
                <p>From ${organization.name}</p>
            </div>
            
            <div class="content">
                <p>Dear ${customer.name},</p>
                
                <p>Thank you for your business! Please find your invoice details below.</p>
                
                <div class="invoice-details">
                    <h3>Invoice Summary</h3>
                    <div class="detail-row">
                        <span class="detail-label">Invoice Number:</span>
                        <span class="detail-value">${invoice.invoiceNo}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Issue Date:</span>
                        <span class="detail-value">${formatDate(invoice.issueDate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Due Date:</span>
                        <span class="detail-value ${isOverdue ? 'overdue' : ''}">${formatDate(invoice.dueDate)}${isOverdue ? ' (OVERDUE)' : ''}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Amount Due:</span>
                        <span class="detail-value amount-due">${formatCurrency(invoice.total)}</span>
                    </div>
                </div>

                ${invoice.items.length > 0 ? `
                <h3>Invoice Items</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Rate</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                        <tr>
                            <td>
                                <strong>${item.description}</strong>
                                ${item.serviceCharge > 0 ? `<br><small style="color: #6b7280;">Service charge: ${formatCurrency(item.serviceCharge)}</small>` : ''}
                            </td>
                            <td style="text-align: center;">${item.pageQty}</td>
                            <td style="text-align: right;">${formatCurrency(item.rate)}</td>
                            <td style="text-align: right;"><strong>${formatCurrency(item.amount)}</strong></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : ''}

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice._id}" class="button">
                        View Invoice Online
                    </a>
                </div>

                ${invoice.notes ? `
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0; color: #92400e;">Additional Notes:</h4>
                    <p style="margin: 0; color: #92400e;">${invoice.notes}</p>
                </div>
                ` : ''}

                <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>
                <strong>${organization.name}</strong></p>

                <div class="company-info">
                    <p><strong>${organization.name}</strong></p>
                    ${organization.address.street ? `<p>${organization.address.street}</p>` : ''}
                    <p>${[organization.address.city, organization.address.state, organization.address.zipCode].filter(Boolean).join(', ')}</p>
                    ${organization.address.country ? `<p>${organization.address.country}</p>` : ''}
                    <p>Email: ${organization.contact.email}</p>
                    ${organization.contact.phone ? `<p>Phone: ${organization.contact.phone}</p>` : ''}
                    ${organization.contact.website ? `<p>Website: ${organization.contact.website}</p>` : ''}
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} ${organization.name}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePlainTextEmail(data: InvoiceEmailData): string {
    const { invoice, customer, organization } = data;
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const formatDate = (date: Date) => 
      new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).format(date);

    const isOverdue = invoice.status !== "paid" && new Date(invoice.dueDate) < new Date();

    return `
Invoice ${invoice.invoiceNo} from ${organization.name}

Dear ${customer.name},

Thank you for your business! Please find your invoice details below.

INVOICE SUMMARY
===============
Invoice Number: ${invoice.invoiceNo}
Issue Date: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}${isOverdue ? ' (OVERDUE)' : ''}
Amount Due: ${formatCurrency(invoice.total)}

INVOICE ITEMS
=============
${invoice.items.map(item => `
${item.description}
Quantity: ${item.pageQty} | Rate: ${formatCurrency(item.rate)} | Amount: ${formatCurrency(item.amount)}
${item.serviceCharge > 0 ? `Service charge: ${formatCurrency(item.serviceCharge)}` : ''}
`).join('\n')}

View invoice online: ${process.env.NEXTAUTH_URL}/invoices/${invoice._id}

${invoice.notes ? `
ADDITIONAL NOTES
================
${invoice.notes}
` : ''}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
${organization.name}

---
${organization.name}
${organization.address.street ? `${organization.address.street}\n` : ''}${[organization.address.city, organization.address.state, organization.address.zipCode].filter(Boolean).join(', ')}
${organization.address.country ? `${organization.address.country}\n` : ''}Email: ${organization.contact.email}
${organization.contact.phone ? `Phone: ${organization.contact.phone}\n` : ''}${organization.contact.website ? `Website: ${organization.contact.website}\n` : ''}

This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} ${organization.name}. All rights reserved.
    `.trim();
  }

  async sendInvoiceEmail(data: InvoiceEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Verify email service connection
      const isConnected = await this.verifyConnection();
      if (!isConnected) {
        throw new Error("Email service is not available");
      }

      const { invoice, customer, organization } = data;

      // Generate PDF attachment
      const pdfBuffer = await renderToBuffer(
        <EnhancedInvoicePDF
          invoice={invoice}
          customer={customer}
          organization={organization}
        />
      );

      // Generate PDF access token for email links
      const pdfToken = await generatePDFToken(invoice._id);
      const pdfUrl = `${process.env.NEXTAUTH_URL}/api/invoices/${invoice._id}/pdf?token=${pdfToken}`;

      // Prepare email content
      const subject = `Invoice ${invoice.invoiceNo} from ${organization.name}`;
      const htmlContent = this.generateInvoiceEmailHTML(data);
      const textContent = this.generatePlainTextEmail(data);

      // Send email
      const info = await this.transporter.sendMail({
        from: {
          name: organization.name,
          address: organization.contact.email,
        },
        to: {
          name: customer.name,
          address: customer.email,
        },
        subject,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: `${invoice.invoiceNo}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
        headers: {
          'X-Invoice-ID': invoice._id,
          'X-Invoice-Number': invoice.invoiceNo,
          'X-Organization': organization.name,
        },
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async sendPaymentReminderEmail(data: InvoiceEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const isConnected = await this.verifyConnection();
      if (!isConnected) {
        throw new Error("Email service is not available");
      }

      const { invoice, customer, organization } = data;
      const isOverdue = new Date(invoice.dueDate) < new Date();
      
      const subject = isOverdue 
        ? `OVERDUE: Payment Reminder for Invoice ${invoice.invoiceNo}`
        : `Payment Reminder: Invoice ${invoice.invoiceNo}`;

      const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
      
      const formatDate = (date: Date) => 
        new Intl.DateTimeFormat('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }).format(date);

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: ${isOverdue ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${isOverdue ? 'OVERDUE PAYMENT' : 'PAYMENT REMINDER'}</h1>
              </div>
              <div class="content">
                  <p>Dear ${customer.name},</p>
                  <p>This is a ${isOverdue ? 'final' : 'friendly'} reminder that payment for Invoice ${invoice.invoiceNo} is ${isOverdue ? 'overdue' : 'due soon'}.</p>
                  <p><strong>Invoice Details:</strong></p>
                  <ul>
                      <li>Invoice Number: ${invoice.invoiceNo}</li>
                      <li>Amount Due: ${formatCurrency(invoice.total)}</li>
                      <li>Due Date: ${formatDate(invoice.dueDate)}</li>
                  </ul>
                  <p>Please process payment at your earliest convenience.</p>
                  <a href="${process.env.NEXTAUTH_URL}/invoices/${invoice._id}" class="button">View Invoice</a>
                  <p>Thank you for your prompt attention to this matter.</p>
                  <p>Best regards,<br>${organization.name}</p>
              </div>
          </div>
      </body>
      </html>
      `;

      const info = await this.transporter.sendMail({
        from: {
          name: organization.name,
          address: organization.contact.email,
        },
        to: {
          name: customer.name,
          address: customer.email,
        },
        subject,
        html: htmlContent,
        priority: isOverdue ? 'high' : 'normal',
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Failed to send payment reminder:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

export const emailService = new EmailService();