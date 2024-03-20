import config from "@/config";
import { handleProcessWebhookCheckout, handleProcessWebhookUpdatedSubscription } from "@/libs/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from 'stripe';
const stripe = new Stripe(config.stripe.secretKey || "");

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = config.stripe.webhookSecret || "";

export async function POST(req: Request, res: Response) {
    const headersList = headers();
    const sig = headersList.get('stripe-signature') as string

    let event;

    // Verify the signature of the Stripe webhook event
    // This code is necessary because Stripe doesn't send JSON, it sends a raw buffer
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }

    try {
        event = await stripe.webhooks.constructEventAsync(buffer, sig, endpointSecret, undefined, Stripe.createSubtleCryptoProvider());
    } catch (err: any) {
        return NextResponse.json({ message: `Webhook Error: ${err?.message}` }, { status: 400 })
    }

    try {
        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntentSucceeded = event.data.object;
                // Then define and call a function to handle the event payment_intent.succeeded
                break;
            case 'checkout.session.completed':
                await handleProcessWebhookCheckout(event.data);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleProcessWebhookUpdatedSubscription(event.data);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ message: `Webhook Error: ${err?.message}` }, { status: 400 })
    }

    return NextResponse.json({ message: 'done' }, { status: 200 })
}