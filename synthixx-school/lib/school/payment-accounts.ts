export const PAYMENT_ACCOUNTS = {
  jazzcash: {
    label: "JazzCash",
    number: "0315-5827433",
    title: "Jawad Zaheer Kyani",
    instructions: "JazzCash app kholein → Send Money → Mobile Number → amount enter karein → Transfer karein → T-ID copy karein",
  },
  easypaisa: {
    label: "EasyPaisa",
    number: "0315-5827433",
    title: "Jawad Zaheer Kyani",
    instructions: "EasyPaisa app kholein → Send Money → Mobile Number → amount enter karein → Transfer karein → T-ID copy karein",
  },
  nayapay: {
    label: "NayaPay",
    id: "jawadkyani@nayapay",
    number: "0345-3490210",
    iban: "PK65 NAYA 1234 5034 5349 0210",
    title: "Jawad Zaheer Kyani",
    instructions: "NayaPay app kholein → Pay/Transfer → NayaPay ID ya account number enter karein → Transfer karein → Receipt ID copy karein",
  },
  bank: {
    label: "Allied Bank",
    title: "Jawad Zaheer Kyani",
    iban: "PK92ABPA0011703343790015",
    account: "06460011703343790015",
    instructions: "Online banking / mobile app mein IBAN ya account number use karein → Transfer karein → Transaction reference copy karein",
  },
} as const;

export type PaymentMethodKey = keyof typeof PAYMENT_ACCOUNTS;
