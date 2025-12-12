import {
    CreateBucketCommand,
    HeadBucketCommand,
    S3Client,
} from "@aws-sdk/client-s3";

const S3_CONFIG = {
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "admin",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "password",
    },
    forcePathStyle: true,
};

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "downloads";
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    console.log("Initializing S3 Client...");
    console.log(`Endpoint: ${S3_CONFIG.endpoint}`);
    console.log(`Bucket: ${BUCKET_NAME}`);

    const client = new S3Client(S3_CONFIG);

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            console.log(`Attempt ${i + 1}/${MAX_RETRIES}: Checking bucket...`);

            // Check if bucket exists
            try {
                await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
                console.log(`Bucket '${BUCKET_NAME}' already exists.`);
                return;
            } catch (err: any) {
                // If 404, we need to create it. If connection refused, we retry.
                if (err && (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404)) {
                    console.log("Bucket not found. Creating...");
                    await client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
                    console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
                    return;
                }
                throw err; // Re-throw other errors (like connection refused)
            }

        } catch (err: any) {
            console.error(`Error: ${err.message}`);
            if (i < MAX_RETRIES - 1) {
                console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
                await sleep(RETRY_DELAY_MS);
            } else {
                console.error("Max retries reached. Exiting.");
                process.exit(1);
            }
        }
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
