import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// Stripe inicializálása
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Ez a titkos kulcs fogja védeni a végpontot (mindjárt meg is szerezzük)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  // 1. Megszerezzük a nyers adatot és a Stripe digitális aláírását
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;

  try {
    if (!sig || !webhookSecret) {
      throw new Error("Hiányzó Stripe webhook titok vagy aláírás.");
    }
    // 2. A Stripe ellenőrzi, hogy tényleg ő küldte-e az adatot
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook Hiba: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // 3. Ha sikeres volt a fizetés (Checkout Session befejeződött)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email; // Ezt az emailt adtuk át a korábbi API-ban!

    if (customerEmail) {
      try {
        // Frissítjük a felhasználót Prémiumra az adatbázisban!
        await prisma.user.update({
          where: { email: customerEmail },
          data: { isPremium: true },
        });
        console.log(`✅ SIKER: ${customerEmail} mostantól Prémium tag!`);
      } catch (error) {
        console.error("❌ Adatbázis hiba a webhook mentésekor:", error);
      }
    }
  }

  // Visszaszólunk a Stripe-nak, hogy mindent rendben megkaptunk (200 OK)
  return NextResponse.json({ received: true }, { status: 200 });
}