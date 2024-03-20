import { prisma } from '@/libs/prisma';
import { headers } from "next/headers"
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const todos = await prisma.todo.findMany()

    return NextResponse.json(todos)
}

interface CreateUserRequest {
    title: string
}

export async function POST(req: Request, context: { body: { title: string } }) {
    const { title } = await req.json() as CreateUserRequest
    const headersList = headers();
    const userID = headersList.get('x-user-id')

    if (userID === null) {
        return NextResponse.json({ message: 'Not authorized' }, { status: 403 })
    }

    const userAlreadyExists = await prisma.user.findUnique({
        where: {
            id: userID
        },
        select: {
            id: true,
            stripeSubscriptionID: true,
            stripeSubscriptionStatus: true,
            _count: {
                select: {
                    Todo: true
                },
            }
        },
    })

    if (userAlreadyExists === null) {
        return NextResponse.json({ message: 'User not found' }, { status: 403 })
    }

    const hasQuotaAvailable = userAlreadyExists._count.Todo < 5
    const hasActiveSubscription = userAlreadyExists.stripeSubscriptionID !== null &&
        ["active", "complete"].includes(userAlreadyExists.stripeSubscriptionStatus || "")

    if (!hasQuotaAvailable && !hasActiveSubscription) {
        return NextResponse.json({ message: 'You have reached the maximum number of todos' }, { status: 403 })
    }

    if (title === undefined) {
        return NextResponse.json({ message: 'Title is required' }, { status: 400 })
    }

    if (typeof title !== 'string') {
        return NextResponse.json({ message: 'Title must be string' }, { status: 400 })
    }

    const todo = await prisma.todo.create({
        data: {
            title: title,
            ownerId: userAlreadyExists.id
        }
    })

    return NextResponse.json(todo, { status: 201 })
}