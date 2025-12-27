
const preambleRegex = /^([\s\*\-_]*)(To perform|I will|Sure|I'll|Certainly|Here is|Then, I'll proceed|In order to|Okay|I've|I can|I've noticed|First|I will first|Secondly|Let me).+?(\.|:|\n)/gim;

let content = `To perform a competitive analysis of the top three companies in the cloud data warehousing space, I will first identify these companies as Amazon Redshift, Google BigQuery, and Snowflake. Then, I'll proceed to gather information on their key product features, pricing models, and recent major announcements.

### Key Product Features:`;

console.log("--- ORIGINAL CONTENT ---");
console.log(content);
console.log("------------------------");

let lastContent = "";
let pass = 0;

while (content !== lastContent && pass < 10) {
    pass++;
    lastContent = content;
    const match = content.match(preambleRegex);
    if (match) {
        console.log(`[PASS ${pass}] Match found: "${match[0]}"`);
        content = content.replace(preambleRegex, '').trim();
    } else {
        console.log(`[PASS ${pass}] No match found.`);
    }
}

console.log("--- FINAL CONTENT ---");
console.log(content);
console.log("---------------------");

const expectedStart = "### Key Product Features:";
if (content.startsWith(expectedStart)) {
    console.log("SUCCESS: Preamble removed.");
} else {
    console.log("FAILURE: Preamble still present.");
}
