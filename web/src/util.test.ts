import { splitByLink } from "./util"

test('link splitting', () => {
  expect(splitByLink("hi there @bro")).toEqual([
    {
      text: "hi there ",
      type: "text",
    },
    {
      text: "@bro",
      type: "user"
    }
  ])

  expect(splitByLink("what is www.snuggly.com??")).toEqual([
    {text: "what is ", type: "text"},
    {text: "www.snuggly.com", type: "link"},
    {text: "??", type: "text"},
  ])

  expect(splitByLink("yo www.google.com")).toEqual([
    {text: "yo ", type: "text"},
    {text: "www.google.com", type: "link"}
  ])

  expect(splitByLink("yo sup @kimdotcom, how is https://www.mega.co.nz going @bro ski?")).toEqual([
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