import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src/data/customMessages.json");

// Utility to read data
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("Error reading data file:", error);
        return [];
    }
};

// Utility to write data
const writeData = (data: any[]) => {
    try {
        // Ensure directory exists
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (error) {
        console.error("Error writing data file:", error);
    }
};

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const title = formData.get("title") as string;
        const message = formData.get("message") as string;
        const audioFile = formData.get("audioUrl"); // User mentioned audioUrl: "audioFile"
        const routeObjIdsStr = formData.get("routeObjIds") as string;
        
        let routeObjIds: string[] = [];
        try {
            routeObjIds = JSON.parse(routeObjIdsStr);
        } catch (e) {
            // Handle if it's sent as multiple fields or comma separated
            routeObjIds = routeObjIdsStr ? routeObjIdsStr.split(",") : [];
        }

        const newMessage = {
            id: Date.now().toString(),
            title,
            message,
            audioUrl: audioFile instanceof File ? audioFile.name : (typeof audioFile === 'string' ? audioFile : ""),
            routeObjIds,
            createdAt: new Date().toISOString(),
        };

        const data = readData();
        data.push(newMessage);
        writeData(data);

        return NextResponse.json({
            success: true,
            message: "Custom message sent successfully",
            data: newMessage
        });
    } catch (error: any) {
        console.error("POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const data = readData();
        // Return in a format similar to other paginated responses if needed
        return NextResponse.json({
            success: true,
            data: data.slice().reverse(), // Most recent first
            totalCount: data.length
        });
    } catch (error: any) {
        console.error("GET Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
