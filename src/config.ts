export default {
    stripe:{
        publicKey: process.env.STRIPE_PUBLIC_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        proPriceID: process.env.STRIPE_PRO_PRICE_ID,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
}