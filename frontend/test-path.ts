import { ShelbyClient } from "@shelby-protocol/sdk";
import { Network } from "@aptos-labs/ts-sdk";

const API_KEY = "AG-MR5SFEFY8BSVMEMVG9YETVQBZJJ2QYEPF";
const ADDRESS = "0x36e9778e4f7550d07c9adf72b2cd9e539a8d8931b6fca544f1bdfbaeb16dd033";
const BLOB_NAME = "1769441053951-generated-image.png";

async function test() {
    const client = new ShelbyClient({
        network: Network.SHELBYNET as any,
        apiKey: API_KEY,
        rpc: {
            baseUrl: "https://api.shelbynet.shelby.xyz/shelby",
        }
    });

    const variations = [
        BLOB_NAME,
        `shelby://${ADDRESS}/${BLOB_NAME}`
    ];

    console.log("🔍 Exhaustive Download Trial...");

    for (const id of variations) {
        console.log(`\n--- Trial with ID: ${id} ---`);
        try {
            const blob = await client.download({
                account: ADDRESS,
                blobName: id,
            });
            console.log("✅ SUCCESS!");
            return;
        } catch (e: any) {
            console.warn("❌ FAILED:", e.message);
        }
    }

    console.log("\nTrying WITHOUT /shelby prefix in BaseURL...");
    const client2 = new ShelbyClient({
        network: Network.SHELBYNET as any,
        apiKey: API_KEY,
        rpc: {
            baseUrl: "https://api.shelbynet.shelby.xyz",
        }
    });

    for (const id of variations) {
        console.log(`\n--- Trial (No /shelby) with ID: ${id} ---`);
        try {
            const blob = await client2.download({
                account: ADDRESS,
                blobName: id,
            });
            console.log("✅ SUCCESS (No /shelby)!");
            return;
        } catch (e: any) {
            console.warn("❌ FAILED:", e.message);
        }
    }
}

test();
