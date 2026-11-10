/* Customer help topics — copied from movo-web app/home/help/page.tsx; keep in sync */
export type HelpTopic = { id: string; title: string; description: string; sections: { heading: string; body: string }[] };

export const helpTopics: HelpTopic[] = [
  {
    "id": "choosing",
    "title": "Choosing a service",
    "description": "City Rides or Safe Ride — which one is right for your trip",
    "sections": [
      {
        "heading": "City Rides — we bring the car",
        "body": "A Movo chauffeur picks you up and takes you where you need to go in a comfortable Standard vehicle. You see the estimated total before you book."
      },
      {
        "heading": "Safe Ride — we drive your car",
        "body": "A professional Movo chauffeur meets you and drives you home in your own vehicle, so you and your car both get home safely. Ideal after an evening out, an event, or whenever you’d rather not drive but don’t want to leave your car behind."
      },
      {
        "heading": "Quick guide",
        "body": "Don’t have your car with you, or just need to get somewhere? Choose City Rides. Your car is with you and you want it home too? Choose Safe Ride."
      },
      {
        "heading": "What happens next",
        "body": "Both start with your pickup and destination. City Rides then shows your Standard ride and fare. Safe Ride asks for your vehicle details instead. Either way you review your fare before you pay, and can follow your chauffeur live on the tracking screen."
      }
    ]
  },
  {
    "id": "booking",
    "title": "Booking a Ride",
    "description": "How to book, choose a service, and schedule ahead",
    "sections": [
      {
        "heading": "Book in a few taps",
        "body": "From the home screen, tap “Where are you heading?”, then set your pickup and destination. Your pickup defaults to your current location, and address suggestions appear as you type. Choose your service level, review the fare estimate, and pay to confirm."
      },
      {
        "heading": "Choose your service",
        "body": "City Rides (Standard) — comfortable everyday rides. Safe Ride — a chauffeur drives you home in your own vehicle. Each shows an estimated total before you book."
      },
      {
        "heading": "Schedule for later",
        "body": "Pick a future date and time when booking. Scheduled rides are lined up with a chauffeur ahead of your pickup, and you’ll be notified when your chauffeur sets off. You can view and manage upcoming rides from the Rides tab."
      },
      {
        "heading": "Change your route during the trip",
        "body": "On the tracking screen, open Actions to add a stop or change your destination. You’ll see the extra cost before anything is charged, and your chauffeur is updated instantly. On the Route tab you can drag your stops into a different order at no extra cost."
      }
    ]
  },
  {
    "id": "payment",
    "title": "Payment & Pricing",
    "description": "Fares, cards, saved payment methods, and receipts",
    "sections": [
      {
        "heading": "How fares are calculated",
        "body": "Your fare is based on a base fare plus distance and time, with a service fee and GST added. Extra charges (additional stops, airport pickup) are shown separately. You always see a clear breakdown and total before you pay."
      },
      {
        "heading": "Payment methods",
        "body": "Movo accepts credit and debit cards, processed securely by Stripe. Movo never stores your full card number. You can save a card during checkout for faster future bookings and in-ride charges, and remove it anytime in Payment settings."
      },
      {
        "heading": "Fare estimates",
        "body": "As soon as you enter your pickup and destination, we show the distance, estimated duration, and an estimated total per service tier. If you change your destination, tier, or add stops, the estimate recalculates automatically."
      },
      {
        "heading": "Receipts",
        "body": "When your trip completes, an itemised receipt (fare, any stops, airport fee, service fee, GST, and total) is emailed to you, and the full breakdown is shown on your ride summary screen."
      }
    ]
  },
  {
    "id": "safety",
    "title": "Safety Features",
    "description": "Live tracking, emergency help, and reporting issues",
    "sections": [
      {
        "heading": "Vetted chauffeurs",
        "body": "Every Movo chauffeur is background-checked, licensed, and insured before they’re activated on the platform. You’ll see your chauffeur’s name and vehicle details once they accept your ride."
      },
      {
        "heading": "Live tracking",
        "body": "Follow your chauffeur on the map in real time, from dispatch to arrival and throughout your trip. The vehicle marker shows their live position and direction of travel."
      },
      {
        "heading": "Emergency assistance",
        "body": "During an active trip, open the Actions tab and use the Emergency option to reach emergency services or Movo support quickly. Your trip details are available to our team if you need help."
      },
      {
        "heading": "Report an issue",
        "body": "After any completed ride you can Report an Issue — chauffeur or vehicle concerns, billing, safety, lost property, or general feedback — and attach photos if needed. Our team reviews every report."
      }
    ]
  },
  {
    "id": "cancellation",
    "title": "Cancellations & Refunds",
    "description": "Cancellation windows, fees, and how refunds work",
    "sections": [
      {
        "heading": "Free cancellation",
        "body": "You can cancel free of charge within 5 minutes of booking, or any time before a chauffeur has been assigned — you’ll receive a full refund. While we’re still finding you a chauffeur, cancelling is always free."
      },
      {
        "heading": "Cancelling after a chauffeur is assigned",
        "body": "If you cancel more than 5 minutes after booking once a chauffeur has accepted, a partial charge may apply to compensate them for their time and travel."
      },
      {
        "heading": "Safe Ride cancellations",
        "body": "Cancelling a Safe Ride before a chauffeur is assigned is free. Once a chauffeur is assigned, and before the trip starts, a $10.00 cancellation fee (including GST) applies and the rest of your payment is refunded."
      },
      {
        "heading": "No-shows",
        "body": "If your chauffeur arrives and can't find or reach you after the free waiting time, they can mark the ride as a no-show. The ride is cancelled, a $5.00 no-show fee (including GST) applies, and the rest of your payment is refunded."
      },
      {
        "heading": "If a chauffeur cancels or none is found",
        "body": "You’re never charged when a chauffeur cancels after accepting, or if we can’t find one for you — Movo automatically finds another chauffeur or issues a full refund, and lets you know."
      },
      {
        "heading": "Refund timing",
        "body": "Refunds are returned to your original payment method. Depending on your bank, they typically appear on your statement within 5–10 business days."
      }
    ]
  },
  {
    "id": "account",
    "title": "Account & Privacy",
    "description": "Profile, ride history, receipts, and account deletion",
    "sections": [
      {
        "heading": "Manage your profile",
        "body": "Update your name, phone number, and personal details from Profile → Personal Info. Keeping your contact details current helps your chauffeur reach you."
      },
      {
        "heading": "Saved payment methods",
        "body": "Add or remove saved cards in Payment settings. Saved cards make future bookings faster and are stored securely by our payment processor, not on Movo’s servers."
      },
      {
        "heading": "Ride history & receipts",
        "body": "View all your past and upcoming rides in the Rides tab. Open any completed ride to see its fare breakdown and receipt."
      },
      {
        "heading": "Account deletion",
        "body": "You can request deletion of your account and personal information at any time from Settings, or by emailing support@movoprive.com. Some records may be retained where required by law."
      }
    ]
  },
  {
    "id": "safe-ride",
    "title": "Safe Ride",
    "description": "Our chauffeur service that drives you home in your own car",
    "sections": [
      {
        "heading": "What is Safe Ride?",
        "body": "A professional Movo chauffeur meets you and drives you home in your own vehicle, so you and your car both get home safely. We take care of getting your chauffeur back afterwards."
      },
      {
        "heading": "When to use it",
        "body": "Perfect for late nights, events, or any time you’d rather not drive but don’t want to leave your car behind."
      },
      {
        "heading": "Booking & pricing",
        "body": "Choose Safe Ride when booking. Safe Ride has its own pricing, shown as an estimate before you confirm. Your chauffeur’s status and live location are shown on your tracking screen."
      }
    ]
  }
];

export const faqs: { question: string; answer: string }[] = [
  {
    "question": "How do I book a ride?",
    "answer": "Tap “Where are you heading?” on the home screen, set your pickup and destination, choose your service tier, review the fare estimate, and pay to confirm."
  },
  {
    "question": "What payment methods are accepted?",
    "answer": "Movo accepts credit and debit cards, processed securely by Stripe. You can save a card for faster checkout and remove it anytime in Payment settings."
  },
  {
    "question": "When am I charged, and can I get a receipt?",
    "answer": "You pay when you book. When the trip completes, an itemised receipt is emailed to you and shown on your ride summary."
  },
  {
    "question": "How do I cancel a ride, and will I be refunded?",
    "answer": "Cancelling within 5 minutes or before a chauffeur is assigned is free with a full refund. After that a partial charge may apply. If a chauffeur cancels or none is found, you’re fully refunded automatically."
  },
  {
    "question": "How can I contact my chauffeur?",
    "answer": "Once your ride is confirmed you can call or message your chauffeur directly from the ride tracking screen."
  },
  {
    "question": "What is Safe Ride?",
    "answer": "A professional Movo chauffeur meets you and drives you home in your own vehicle, so you and your car both get home safely. We take care of getting your chauffeur back afterwards."
  }
];
