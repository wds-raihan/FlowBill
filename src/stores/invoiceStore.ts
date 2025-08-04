import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { InvoiceFormData, InvoiceItemFormData } from '@/features/invoices/InvoiceForm/InvoiceFormSchema';

interface InvoiceState {
  // Form state
  currentStep: number;
  formData: Partial<InvoiceFormData>;
  isDraft: boolean;
  isSubmitting: boolean;
  
  // Items management
  items: InvoiceItemFormData[];
  
  // Calculations
  subTotal: number;
  total: number;
  
  // Actions
  setCurrentStep: (step: number) => void;
  updateFormData: (data: Partial<InvoiceFormData>) => void;
  addItem: (item: InvoiceItemFormData) => void;
  updateItem: (index: number, item: InvoiceItemFormData) => void;
  removeItem: (index: number) => void;
  calculateTotals: () => void;
  resetForm: () => void;
  saveDraft: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

const initialFormData: Partial<InvoiceFormData> = {
  issueDate: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  items: [],
  tax: 0,
  discount: 0,
  notes: '',
};

export const useInvoiceStore = create<InvoiceState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentStep: 1,
        formData: initialFormData,
        isDraft: false,
        isSubmitting: false,
        items: [],
        subTotal: 0,
        total: 0,

        // Actions
        setCurrentStep: (step) => 
          set({ currentStep: step }, false, 'setCurrentStep'),

        updateFormData: (data) =>
          set(
            (state) => ({
              formData: { ...state.formData, ...data },
              isDraft: true,
            }),
            false,
            'updateFormData'
          ),

        addItem: (item) =>
          set(
            (state) => {
              const newItems = [...state.items, item];
              const newFormData = { ...state.formData, items: newItems };
              return {
                items: newItems,
                formData: newFormData,
                isDraft: true,
              };
            },
            false,
            'addItem'
          ),

        updateItem: (index, item) =>
          set(
            (state) => {
              const newItems = [...state.items];
              newItems[index] = item;
              const newFormData = { ...state.formData, items: newItems };
              return {
                items: newItems,
                formData: newFormData,
                isDraft: true,
              };
            },
            false,
            'updateItem'
          ),

        removeItem: (index) =>
          set(
            (state) => {
              const newItems = state.items.filter((_, i) => i !== index);
              const newFormData = { ...state.formData, items: newItems };
              return {
                items: newItems,
                formData: newFormData,
                isDraft: true,
              };
            },
            false,
            'removeItem'
          ),

        calculateTotals: () =>
          set(
            (state) => {
              const subTotal = state.items.reduce((sum, item) => sum + item.amount, 0);
              const tax = state.formData.tax || 0;
              const discount = state.formData.discount || 0;
              const total = Math.max(0, subTotal + tax - discount);
              
              return {
                subTotal,
                total,
                formData: {
                  ...state.formData,
                  subTotal,
                  total,
                },
              };
            },
            false,
            'calculateTotals'
          ),

        resetForm: () =>
          set(
            {
              currentStep: 1,
              formData: initialFormData,
              isDraft: false,
              isSubmitting: false,
              items: [],
              subTotal: 0,
              total: 0,
            },
            false,
            'resetForm'
          ),

        saveDraft: () =>
          set(
            (state) => ({
              isDraft: false,
            }),
            false,
            'saveDraft'
          ),

        setSubmitting: (isSubmitting) =>
          set({ isSubmitting }, false, 'setSubmitting'),
      }),
      {
        name: 'invoice-form-storage',
        partialize: (state) => ({
          formData: state.formData,
          items: state.items,
          currentStep: state.currentStep,
          isDraft: state.isDraft,
        }),
      }
    ),
    {
      name: 'invoice-store',
    }
  )
);

// Computed selectors
export const useInvoiceSelectors = () => {
  const store = useInvoiceStore();
  
  return {
    ...store,
    isFormValid: store.items.length > 0 && store.formData.customerId,
    canProceedToNext: (step: number) => {
      switch (step) {
        case 1:
          return !!store.formData.customerId;
        case 2:
          return store.items.length > 0;
        case 3:
          return true;
        default:
          return false;
      }
    },
    hasUnsavedChanges: store.isDraft,
  };
};