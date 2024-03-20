import { prisma } from '@/libs/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

type Params = {
    id: string;
}

export async function GET(req: Request, context: { params: Params }) {
    const id = context.params.id
    if (id === undefined) {
        return NextResponse.json({ message: 'User id required' }, { status: 400 })
    }
    if (typeof id !== 'string') {
        return NextResponse.json({ message: 'User id must be a string' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({
        where: {
            id: id || "",
        }
    })

    return NextResponse.json(user)
}