/* eslint-disable @typescript-eslint/no-explicit-any */
import completedKata from "../../private/assets/completedKata"
import scrapeHTML from "./scrapper"
import { join } from "node:path"
import fs from "node:fs"
import Axios from "axios"
import axiosThrottle from "axios-request-throttle"
import json2md from "json2md"
import cheerio from "cheerio"

axiosThrottle.use(Axios, { requestsPerSecond: 2 })

// Variables
const date = new Date().toISOString().split("T")[0]
const html = scrapeHTML()
const kataTests: { id: string; language: string; code: string } = { id: "", language: "", code: "" }
const rootFolder = "/Users/jdold07/Dropbox/Code/codewars-solutions"
const SESSION_ID =
  "_session_id=f8b560c2297e63decb4c3f73a4ef4b7c; Expires=Sat, 08 Oct 2022 00:52:36 GMT; Path=/; HttpOnly; SameSite=Lax; Domain=www.codewars.com"
const myLanguages = new Map([
  ["javascript", { name: "JavaScript", extension: "js" }],
  ["typescript", { name: "TypeScript", extension: "ts" }],
  ["coffeescript", { name: "CoffeeScript", extension: "coffee" }],
  ["python", { name: "Python", extension: "py" }],
  ["swift", { name: "Swift", extension: "swift" }]
])

// Fetch completed kata detail from Codewars API & process folders & markdown description file
async function processKatas() {
  for (const kata of completedKata.kata) {
    try {
      const response = await Axios.get(`https://www.codewars.com/api/v1/code-challenges/${kata.id}`)
      const rankFolder = `kata-${Math.abs(response.data.rank.id) || "beta"}-kyu`
      response.data.slug = response.data.slug.replace(/^(\d+)/, "_$1")
      const fullPath = join(rootFolder, rankFolder, response.data.slug)

      writePathsAndFiles(response.data, fullPath, kata)
    } catch (err: any) {
      console.error(`Something halted main app flow\n${err}`)
      // throw Error(`Something stopped main app flow\n${err}`)
    }
  }
  console.log("Processing COMPLETE!  Check output path to confirm everything has completed as expected.")
}

/*
 *Helper function for filename case convention specific to individual languages
 *@Param: slug <string> Kata name in slug format (eg this-kata-name)
 *@Param: flag <string> Identifier for case type ("c", "s", default="no")
 *@Return => <string> Kata slug reformatted to language case convention
 */
const changeCase = (slug: string, flag = "no") =>
  flag === "c"
    ? slug.replace(/-(\w)/g, (_: string, $1: string) => `${$1.slice(0, 1).toUpperCase()}${$1.slice(1)}`)
    : slug.replace(/-/g, "_")

// Create file paths, code files & code test files for Kata
function writePathsAndFiles(kata: any, fullPath: string, completionDetail: any) {
  // Create individual Kata root path
  try {
    fs.mkdirSync(fullPath, { recursive: true, mode: 755 })
    console.log(`Create /${kata.slug} directory`)
  } catch (err) {
    console.warn(`Error creating /${kata.slug} directory\n${err}`)
  }
  // Generate and write Kata description markdown file
  try {
    fs.writeFileSync(join(fullPath, `${kata.slug}.md`), generateMarkdownString(kata, completionDetail), {
      flag: "w",
      mode: 644
    })
    console.log(`Writing markdown description file for ${kata.slug}`)
  } catch (err) {
    console.warn(`Error writing ${kata.slug} MD file\n${err}`)
  }

  Array.from(myLanguages.keys())
    .filter(
      (v) =>
        kata.languages.includes(v) &&
        completionDetail[completionDetail.findIndex((x: any) => x.id === kata.id)].completedLanguages.includes(v)
    )
    .forEach(async (v: string) => {
      // Fetch tests from Codewars.com solutions page
      try {
        const response = await Axios.get(`https://www.codewars.com/kata/${kata.id}/solutions/${v}`, {
          headers: { Cookie: SESSION_ID }
        })
        const $ = cheerio.load(response.data)
        const testsCode = $("#kata-details-description", response.data).siblings().find("code").text()

        Object.assign(kataTests, { id: kata.id, language: v, code: testsCode })

        console.log("Retrieved Kata TESTS data from Codewars.com")
      } catch (err) {
        console.error(`Error fetching Kata TESTS from Codewars.com for ${kata.id} in ${v}\n${err}`)
        // throw Error(`Get Kata detail for ${id}\n${err}`)
      }

      // Set language path
      const langPath = join(fullPath, v)
      // Set language file extension
      const langExt = myLanguages.get(v)?.extension
      // Set filename case type
      const kataFilename = v === "python" ? changeCase(kata.slug, "s") : changeCase(kata.slug, "c")
      // Merge solution code & tests code into Kata details data
      const KATA = mergeData(kata, v)

      // Create individual Kata language path
      if (KATA.code !== "") {
        try {
          fs.mkdirSync(langPath, { recursive: true, mode: 755 })
          console.log(`Create /${kata.slug}/${v} directory`)
        } catch (err) {
          console.warn(`Error creating /${kata.slug}/${v} directory\n${err}`)
        }

        // Generate & write solution code file
        try {
          fs.writeFileSync(join(langPath, `${kataFilename}.${langExt}`), formatString(KATA, v, "code"), {
            flag: "w",
            mode: 644
          })
          console.log(`Writing ${KATA.slug} ${v} CODE file`)
        } catch (err) {
          console.warn(`Error writing ${kataFilename}.${langExt} CODE file\n${err}`)
        }

        // Generate & write tests code file
        try {
          fs.writeFileSync(
            join(langPath, v === "python" ? `${kataFilename}_test.${langExt}` : `${kataFilename}.Test.${langExt}`),
            formatString(KATA, v, "test"),
            { flag: "w", mode: 644 }
          )
          console.log(`Writing ${kata.id} ${v} TESTS file`)
        } catch (err) {
          console.warn(`Error writing ${kataFilename}.${langExt} TESTS file\n${err}`)
        }
      }
    })
}

// json2md mapping / layout to generate markdown file content
function generateMarkdownString(kata: any, completed: any): string {
  try {
    console.log(`Parsing markdown format for ${kata.slug}`)
    return json2md([
      { h1: `${kata?.rank?.name || "BETA"} - ${kata?.name}` },
      {
        h5: `**ID**: [${kata?.id || "*not available*"}](${kata?.url}) | **Slug**: [${kata?.slug || "*not available*"}](${
          kata?.url
        }) | **Category**: \`${kata?.category?.toUpperCase() || "NONE"}\` | **Rank**: <span style="color:${
          kata?.rank?.color || "grey"
        }">${kata?.rank?.name || "*BETA*"}</span>`
      },
      {
        h5: `**First Published**: ${kata?.publishedAt?.split("T")[0] || "*not available*"} ***by*** [${
          kata?.createdBy?.username || "*not available*"
        }](${kata?.createdBy?.url || "https://www.codewars.com"}) | **Approved**: ${
          kata?.approvedAt?.split("T")[0] || "*not available*"
        } ***by*** [${kata?.approvedBy?.username || "*not available*"}](${
          kata?.approvedBy?.url || "*https://www.codewars.com*"
        })`
      },
      { h5: `**Languages Available**: ${kata?.languages?.join(", ") || "*not available*"}` },
      {
        h5: `**My Completed Languages**: ${
          completed?.completedLanguages?.join(", ") || "*not available*"
        } ***as at*** ${date} | **Originally completed**: ${completed?.completedAt?.split("T")[0] || "*not available*"}`
      },
      { hr: "" },
      { h2: "Kata Description" },
      {
        p:
          kata?.description ||
          `# Ooops ... Description not available\n### Description was not available for [${kata?.id}](${kata?.url}) at the time of markdown generation.`
      },
      { hr: "" },
      { p: `🏷 \`${kata?.tags?.join(" | ").toUpperCase() || "NONE"}\`` },
      { p: `[View this Kata on Codewars.com](${kata?.url || "https://www.codewars.com"})` },
      { img: { title: "JDOld07 Codewars Badge", source: "https://www.codewars.com/users/jdold07/badges/large" } },
      { hr: "" },
      {
        h6: "*This Kata description was compiled by [**JDOld07**](https://tpstech.dev) with data provided by the [Codewars.com](https://www.codewars.com) API.  The solutions in this repo associated with this kata are my solutions unless otherwise noted in the code file.  Test cases are generally those as provided in the Kata, but may include additional test cases I created while coding my solution.  My solutions are not always commented as the solutions are rarely submitted with comments.*"
      }
    ])
  } catch (err) {
    console.log(`Possible issue while executing json2md for ${kata?.name}\n${err}`)
    return `# Ooops, something went wrong!\n### An error occurred while generating the Markdown file's content.  [${kata?.id}](${kata?.url})`
  }
}

// Combine completed kata detail with scraped HTML data ready for writing to code files
//TODO - After running and confirming no error logged from this function, delete the if statement and simplify
function mergeData(kata: any, lang: string) {
  const index = html.findIndex((v: any) => v.id === kata.id && v.language === lang)
  if (index !== -1) {
    console.log(`Added solution & tests code data for ${kata.slug} in ${lang}`)
    return Object.assign(kata, { code: html[index]?.code || "", tests: kataTests?.code })
  }
  console.error(`NO SOLUTION for ${kata.slug} in ${lang} ... SHOULDN'T EVER HIT THIS!!!`)
  return Object.assign(kata, { code: "", tests: "" })
}

// Format string for code file
function formatString(KATA: any, lang: string, flag: string) {
  console.log(`Formatting ${flag === "code" ? "CODE" : "TESTS"} string for ${KATA.slug} in ${lang}`)

  // All hash comment languages formatting
  if (lang === "python" || lang === "coffeescript") {
    //? Python formatting
    if (lang === "python") {
      if (flag === "code") {
        // CODE STRING - Reformat export, imports & test config for local use
      }
      if (flag === "test") {
        // TEST STRING - Reformat export, imports & test config for local use
        // Remove any existing import of Codewars framework & import of "solution" module
        KATA.tests = KATA?.tests.replace(/import codewars_test as test/g, "").replace(/from solution import \w+/g, "")
        // Insert import for Codewars python test framework & import CODE module to TEST
        KATA.tests = `import codewars_test as test\nfrom${KATA?.slug} import ${
          KATA?.tests?.match(/(?<=equals\()(\w+)(?=\()/)[0]
        }\n\n\n${KATA.tests}`
      }
    }

    //? CoffeeScript formatting
    if (lang === "coffeescript") {
      if (flag === "code") {
        // CODE STRING - Reformat export, imports & test config for local use
        // Append export group of top level declarations
        KATA.code = `${KATA?.code}\n\nmodule.exports = { ${KATA?.code
          .match(/^(\w+)(?=(?:\s=\s\(\w+).*(?:->|=>))/gm)
          .join(", ")} }`
      }
      if (flag === "test") {
        // TEST STRING - Reformat export, imports & test config for local use
        // Remove any existing reference to Test
        KATA.tests = KATA?.tests.replace(/Test\./g, "")
        // Replace assertions with Chai types
        KATA.tests = KATA?.tests
          .replace(/assertEquals/g, "assert.strictEqual")
          .replace(/(assertDeepEquals|assertSimilar)/g, "assert.deepEqual")
        // Insert import for Chai & CODE file/module
        KATA.tests = `\n{ assert } = require "chai"\n{ ${
          KATA?.tests.match(/(?<=assert\.\w+(?:\s|\s?\())(\w+)(?=(?:\s|\)))/)[0]
        } } = require "./${KATA.slug}"\n\n${KATA?.tests}\n`
      }
    }

    // Return formatted header & reconfigured CODE || TEST strings for hash comment languages
    return `# ${KATA?.rank?.name} - ${KATA?.name}  [ ID: ${KATA?.id} ] (${KATA?.slug})\n# URL: ${KATA.url}\n# Category: ${
      KATA?.category?.toUpperCase() || "NONE"
    }  |  Tags: ${KATA?.tags?.join(" | ").toUpperCase() || "NONE"}\n\n# ${"=".repeat(118)}\n\n\n${
      (flag === "code" ? KATA?.code : KATA?.tests) || ""
    }\n`
  }

  // All double forward slash comment languages formatting
  if (lang === "javascript" || lang === "typescript" || lang === "swift") {
    //? JavaScript formatting
    if (lang === "javascript") {
      if (flag === "code") {
        // CODE STRING - Reformat export, imports & test config for local use
        // Remove existing exports on top level const & functions & any object exports - //! Shouldn't need this for JS
        KATA.code = KATA?.code.replace(/^export\s(?:(?:default\s)?(?=(?:const|let|var|function))|({.*)?$)/gm, "")
        // Append export object that includes all top level const and/or function names
        KATA.code = `${KATA?.code}\n\nmodule.exports = { ${KATA?.code
          .match(/(?<=(?:^const|^function)\s)(\w+)(?=(?:\s=\s\(|\s?\())/gm)
          .join(", ")} }`
      }

      if (flag === "test") {
        // TEST STRING - Reformat export, imports & test config for local use
      }
    }

    //? TypeScript formatting
    if (lang === "typescript") {
      if (flag === "code") {
        // CODE STRING - Reformat export, imports & test config for local use
        // Remove existing exports on top level const & functions & any object exports
        KATA.code = KATA?.code.replace(/^export\s(?:(?:default\s)?(?=(?:const|let|var|function))|({.*)?$)/gm, "")
        // Append export object that includes all top level const and/or function names
        KATA.code = `${KATA?.code}\n\nexport { ${KATA?.code
          .match(/(?<=(?:^const|^function)\s)(\w+)(?=(?:\s=\s\(|\s?\())/gm)
          .join(", ")} }`
      }

      if (flag === "test") {
        // TEST STRING - Reformat export, imports & test config for local use
      }
    }

    //? Swift formatting
    if (lang === "swift") {
      if (flag === "code") {
        // CODE STRING - Reformat export, imports & test config for local use
      }
      if (flag === "test") {
        // TEST STRING - Reformat export, imports & test config for local use
      }
    }

    // Return formatted header & reconfigured CODE || TEST strings for double forward slash comment languages
    return `// ${KATA?.rank?.name} - ${KATA?.name}  [ ID: ${KATA?.id} ] (${KATA?.slug})\n// URL: ${
      KATA.url
    }\n// Category: ${KATA?.category?.toUpperCase()}  |  Tags: ${
      KATA?.tags?.join(" | ").toUpperCase() || "NONE"
    }\n\n// ${"=".repeat(117)}\n\n${(flag === "code" ? KATA?.code : KATA?.tests) || ""}\n`
  }

  //! CATCHALL / Fall-through formatting - Should not ever hit this!!!
  // else {
  //   console.error(`REACHED CATCHALL ... Formatting ${flag === "code" ? "CODE" : "TESTS"} string for ${KATA.slug} in ${lang}`)
  //   return `// ${KATA?.rank?.name} - ${KATA?.name}  [ ID: ${KATA?.id} ] (${KATA?.slug})\n// URL: ${
  //     KATA.url
  //   }\n// Category: ${KATA?.category?.toUpperCase()}  |  Tags: ${
  //     KATA?.tags?.join(" | ").toUpperCase() || "NONE"
  //   }\n\n// ${"=".repeat(117)}\n\n${(flag === "code" ? KATA?.code : KATA?.tests) || ""}\n`
  // }
}

// Run this bitch!
processKatas()