import config from "@/config";
import Stripe from "stripe";
import { prisma } from "./prisma";
import { get } from "http";

export const stripe = new Stripe(config.stripe.secretKey || "", {
    apiVersion: "2023-10-16",
})

export const getStripeCustomerByEmail = async (email: string, name?: string) => {
    const customer = await stripe.customers.list({
        email,
        limit: 1
    })

    if (customer?.data.length > 0)
        return customer.data[0]

    const newCustomer = await stripe.customers.create({
        email,
        name,
    })

    return newCustomer
}

export const createCheckoutSession = async (userID: string, email: string) => {
    try {
        let customer = await getStripeCustomerByEmail(email)

        const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price: config.stripe.proPriceID,
                quantity: 1,
            }],
            mode: "subscription",
            client_reference_id: userID,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
            customer: customer.id,
        })

        return {
            url: session.url,
            stripeCustomerID: customer.id,
        }
    } catch (error) {
        console.error(error)
        return null
    }
}

export const handleProcessWebhookCheckout = async (event: { object: Stripe.Checkout.Session }) => {
    const clientReferenceID = event.object.client_reference_id
    const stripeSubscriptionID = event.object.subscription
    const stripeCustomerID = event.object.customer
    const stripeSubscriptionStatus = event.object.status

    if (event.object.status !== "complete") return

    // Check if event is valid
    if (
        !clientReferenceID ||
        !stripeSubscriptionID ||
        !stripeCustomerID ||
        typeof clientReferenceID !== "string" ||
        typeof stripeSubscriptionID !== "string" ||
        typeof stripeCustomerID !== "string"
    ) {
        throw new Error("Invalid event")
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
        where: {
            id: clientReferenceID
        },
        select: {
            id: true
        }
    })

    // If user does not exist, throw error
    if (!userExists) {
        throw new Error("User not found")
    }

    // Update user with subscription and customer IDs
    await prisma.user.update({
        where: {
            id: userExists.id
        },
        data: {
            stripeSubscriptionID,
            stripeCustomerID,
            stripeSubscriptionStatus,
        }
    })
}

export const handleProcessWebhookUpdatedSubscription = async (event: { object: Stripe.Subscription }) => {
    const stripeCustomerID = event.object.customer as string
    const stripeSubscriptionID = event.object.id as string
    const stripeSubscriptionStatus = event.object.status as string

    // Check if user exists
    const userExists = await prisma.user.findFirst({
        where: {
            stripeCustomerID,
        },
        select: {
            id: true
        }
    })

    // If user does not exist, throw error
    if (!userExists) {
        throw new Error(`User not found for customer ID: ${stripeCustomerID}`)
    }

    prisma.user.update({
        where: {
            id: userExists.id
        },
        data: {
            stripeSubscriptionID,
            stripeSubscriptionStatus,
        }
    })
}