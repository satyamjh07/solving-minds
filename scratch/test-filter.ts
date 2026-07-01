import { hasExplicitContent } from '../src/lib/wordFilter';

const testCases = [
  { title: "Normal post title", content: "I am having doubts in organic chemistry, specifically electrophilic addition.", expected: false },
  { title: "Help with maths", content: "What is the coordinate geometry formula for distance?", expected: false },
  { title: "Class homework help", content: "Can someone document this physics problem?", expected: false },
  { title: "Abusive english", content: "this post has shit and fuck in it", expected: true },
  { title: "Abusive english leet", content: "th1s has sh1t and f*u*c*k", expected: true },
  { title: "Hindi abuse latin", content: "bahut badhiya chutiya post hai", expected: true },
  { title: "Hindi abuse devanagari", content: "बकवास चूतिया पोस्ट है", expected: true }
];

console.log("Running Word Filter verification tests...");
let passed = 0;
testCases.forEach((tc, idx) => {
  const result = hasExplicitContent(tc.title, tc.content);
  if (result === tc.expected) {
    console.log(`Test case ${idx + 1} PASSED`);
    passed++;
  } else {
    console.error(`Test case ${idx + 1} FAILED. Input: Title="${tc.title}" Content="${tc.content}". Expected ${tc.expected}, got ${result}`);
  }
});

console.log(`Passed ${passed}/${testCases.length} tests.`);
if (passed !== testCases.length) {
  process.exit(1);
}
