import fs from 'fs';
import path from 'path';

async function runTests() {
    console.log("=== Security Integration Test Suite ===\n");
    
    // 1. Parse .env.local for password
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
    const dbPasswordLine = envContent.split('\n').find(l => l.startsWith('APP_PASSWORD='));
    if (!dbPasswordLine) {
        console.error("Could not find APP_PASSWORD in .env.local");
        process.exit(1);
    }
    const appPassword = dbPasswordLine.split('=')[1].trim();

    // 2. Authenticate
    console.log("[TEST] 1. Authentication Check");
    const authRes = await fetch('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: appPassword })
    });
    
    if (!authRes.ok) throw new Error("Auth failed.");
    const setCookieHeader = authRes.headers.get('set-cookie');
    if (!setCookieHeader) throw new Error("No secure cookie returned setting up the test.");
    
    const cookie = setCookieHeader.split(';')[0];
    console.log("✅ Successfully authenticated and attached HTTPOnly cookie.");

    // 3. Test Sanitization Mocks
    console.log("\n[TEST] 2. Payload Validation & HTML Sanitization");
    const maliciousPayload = {
        candidateEmail: "test@example.com",
        candidateName: "<script>alert('xss')</script>Hacker",
        interviewerName: "<b>Evil</b> <a href='http://evil.com'>Trainer</a>",
        overallFeedback: "test feedback",
        pdfBase64: "JVBERi0xLjQ...dummyBase64PDF", // Must start with JVBER to pass magic header check
        pdfFileName: "Hacked.pdf"
    };

    const payloadTestRes = await fetch('http://localhost:3000/api/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookie,
            'x-mock-test': 'true' // Trigger our test hook
        },
        body: JSON.stringify(maliciousPayload)
    });

    const payloadData = await payloadTestRes.json();
    if (payloadData.mocked) {
         console.log("✅ Mock endpoint hooked correctly. Resend bypass active.");
         // Verify Sanitization
         if (payloadData.safeCandidateName === "Hacker" && payloadData.safeInterviewerName === "Evil Trainer") {
             console.log("✅ HTML successfully stripped from input variables!");
         } else {
             console.error("❌ Sanitization failed!", payloadData);
         }
    } else {
         console.error("❌ Endpoint ignored the mock hook!", payloadData);
    }

    // 4. Rate Limiter Testing
    console.log("\n[TEST] 3. In-Memory Rate Limiter Bombing");
    let rateLimitTripped = false;
    for(let i = 0; i < 7; i++) {
        const spamRes = await fetch('http://localhost:3000/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'x-mock-test': 'true' },
            body: JSON.stringify(maliciousPayload)
        });

        if (spamRes.status === 429) {
            console.log("✅ Rate Limiter successfully tripped on request #" + (i + 1) + "! Defended against automated bombings.");
            rateLimitTripped = true;
            break;
        }
    }

    if (!rateLimitTripped) {
         console.error("❌ Rate limiter failed to trip after 7 rapid requests.");
    }
}

runTests().catch(console.error);
