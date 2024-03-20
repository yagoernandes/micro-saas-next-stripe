import { prisma } from '@/libs/prisma';
import { getStripeCustomerByEmail } from '@/libs/stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const users = await prisma.user.findMany()

    return NextResponse.json(users)
}

interface CreateUserRequest  {
        name: string,
        email: string
}

export async function POST(req: Request, context: { body: { name: string, email: string } }) {
    const { name, email } = await req.json() as CreateUserRequest

    if (name === undefined || email === undefined) {
        return NextResponse.json({ message: 'Name and email required' }, { status: 400 })
    }

    if (typeof name !== 'string' || typeof email !== 'string') {
        return NextResponse.json({ message: 'Name and email must be strings' }, { status: 400 })
    }

    const userAlreadyExists = await prisma.user.findUnique({
        where: {
            email
        },
        select: {
            id: true
        }
    })

    if (userAlreadyExists !== null) {
        return NextResponse.json({ message: 'User with that email already exists' }, { status: 400 })
    }

    const stripeCustomer = await getStripeCustomerByEmail(email, name)

    console.log(`stripeCustomer`, stripeCustomer)

    const user = await prisma.user.create({
        data: {
            name,
            email,
            stripeCustomerID: stripeCustomer?.id,
        }
    })


    return NextResponse.json(user, { status: 201 })
}