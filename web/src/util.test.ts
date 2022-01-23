import { feltToString, splitByLink, stringToFelt } from "./util"
import * as ethers from "ethers"
import { expect } from "chai";

test('link splitting', () => {
  expect(splitByLink("hi there @bro")).to.deep.eq([
    {
      text: "hi there ",
      type: "text",
    },
    {
      text: "@bro",
      type: "user"
    }
  ])

  expect(splitByLink("what is www.snuggly.com??")).to.deep.eq([
    {text: "what is ", type: "text"},
    {text: "www.snuggly.com", type: "link"},
    {text: "??", type: "text"},
  ])

  expect(splitByLink("yo www.google.com")).to.deep.eq([
    {text: "yo ", type: "text"},
    {text: "www.google.com", type: "link"}
  ])

  expect(splitByLink("yo sup @kimdotcom, how is https://www.mega.co.nz going @bro ski?")).to.deep.eq([
    {
      text: "yo sup ",
      type: "text",
    },
    {
      text: "@kimdotcom",
      type: "user",
    },
    {
      text: ", how is ",
      type: "text",
    },
    {
      text: "https://www.mega.co.nz",
      type: "link",
    },
    {
      text: " going ",
      type: "text",
    },
    {
      text: "@bro",
      type: "user",
    },
    {
      text: " ski?",
      type: "text",
    },
  ])
});

test('string <-> felt', () => {
  let cases: Array<[string, Array<number>, Array<ethers.BigNumber>]> = [
    ["", [], []], // TODO: make this cause an error
    ["1", [49], [ethers.BigNumber.from("0x31")]],
    ["11111", [49, 49, 49, 49, 49], [ethers.BigNumber.from("0x3131313131")]],
    // TODO: test emojis
    // 31 bytes fits in 1 felt
    [
      "111111111 111111111 111111111 1", 
      [49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49],
      [ethers.BigNumber.from("0x31313131313131313120313131313131313131203131313131313131312031")]
    ],
    // 32 bytes requires 2 felts
    [
      "111111111 111111111 111111111 11",
      [49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49],
      [ethers.BigNumber.from("0x31313131313131313120313131313131313131203131313131313131312031"), ethers.BigNumber.from("0x31")]
    ],
    // 62 bytes fits in 2 felts
    [
      "111111111 111111111 111111111 111111111 111111111 111111111 11",
      [49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49],
      [ethers.BigNumber.from("0x31313131313131313120313131313131313131203131313131313131312031"), ethers.BigNumber.from("0x31313131313131312031313131313131313120313131313131313131203131")]
    ],
    // 63 bytes requires 3 felts
    [
      "111111111 111111111 111111111 111111111 111111111 111111111 111",
      [49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49, 49, 49, 49, 49, 49, 49, 49, 32, 49, 49, 49],
      [ethers.BigNumber.from("0x31313131313131313120313131313131313131203131313131313131312031"), ethers.BigNumber.from("0x31313131313131312031313131313131313120313131313131313131203131"), ethers.BigNumber.from("0x31")]
    ],
  ]

  for (let i = 0; i < cases.length; i++) {
    let decimal = cases[i][0];
    let bigNumber = cases[i][2];
    expect(stringToFelt(decimal)).to.deep.eq(bigNumber);
    expect(feltToString(bigNumber)).to.deep.eq(decimal);
  }
})