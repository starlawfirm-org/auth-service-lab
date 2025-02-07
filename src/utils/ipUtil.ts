import { Request } from "express";

export const getIpAddress = async (req: Request) => {
    const forwardedFor = req.header("x-forwarded-for") as string;
    const ip = forwardedFor || req.socket.remoteAddress;
    return ip;
};
