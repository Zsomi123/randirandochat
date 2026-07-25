import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Stripe from "stripe";

// A Stripe inicializálása a titkos kulcsoddal (apiVersion nélkül)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
// ... a kód többi része marad ugyanaz ...
  try {
    // 1. Ellenőrizzük, hogy be van-e jelentkezve a felhasználó
    const session = await getServerSession();
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Nincs bejelentkezve" }, { status: 401 });
    }

    // 2. Létrehozzuk a Stripe fizetési munkamenetet (Checkout Session)
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment", // "payment" = egyszeri fizetés, "subscription" = havidíjas
      customer_email: session.user.email, // Így a Stripe rögtön tudja, kinek a nevére megy a számla
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: "Prémium Tagság (Örökös)",
              description: "Korlátlan napi párosítás és chat.",
            },
            unit_amount: 199000, // 1990 HUF (A Stripe mindig fillérben/centben számol, ezért kell a + két nulla)
          },
          quantity: 1,
        },
      ],
      // Ide dobjuk vissza a felhasználót fizetés után (a localhost:3000-re vagy az éles domainre)
      success_url: `${process.env.NEXTAUTH_URL}/premium?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/premium?canceled=true`,
    });

    // 3. Visszaküldjük a fizetési linket a frontendnek
    return NextResponse.json({ url: stripeSession.url });
    
  } catch (error: any) {
    console.error("Stripe hiba:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}