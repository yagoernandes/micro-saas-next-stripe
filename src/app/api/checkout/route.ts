import { prisma } from '@/libs/prisma';
import { createCheckoutSession } from '@/libs/stripe';
import { headers } from "next/headers"
import { NextResponse } from 'next/server';

interface CreateCheckoutRequest {
    plan: string
}

export async function POST(req: Request, context: { body: { plan: string } }) {
    const headersList = headers();
    const { plan } = await req.json() as CreateCheckoutRequest
    const userID = headersList.get('x-user-id')

    if (userID === null) {
        return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    }

    const userAlreadyExists = await prisma.user.findUnique({
        where: {
            id: userID
        }
    })

    if (userAlreadyExists === null) {
        return NextResponse.json({ message: 'User not found' }, { status: 403 })
    }

    if (plan === undefined) {
        return NextResponse.json({ message: 'Plan is required' }, { status: 400 })
    }

    if (typeof plan !== 'string') {
        return NextResponse.json({ message: 'Plan must be string' }, { status: 400 })
    }

    const checkout = await createCheckoutSession(userAlreadyExists.id, userAlreadyExists.email)

    // await prisma.user.update({
    //     where: {
    //         id: userID
    //     },
    //     data: {
    //         stripeCustomerID: checkout?.stripeCustomerID,
    //     }
    // })

    return NextResponse.json({
        url: checkout?.url,
        plan,
    }, { status: 201 })
}