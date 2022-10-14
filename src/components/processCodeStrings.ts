/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "node:path"
import { changeCase } from "./helpers"

export default function processCodeStrings(kataData: any): any {
  // Format string for writing code file || test file
  const langFilename = kataData.curLang === "python" ? changeCase(kataData.slug, "s") : changeCase(kataData.slug, "c")

  switch (kataData.curLang) {
    case "typescript":
      return typescriptFormatting(kataData, langFilename)
    case "javascript":
      return javascriptFormatting(kataData, langFilename)
    case "swift":
      return swiftFormatting(kataData, langFilename)
    case "python":
      return pythonFormatting(kataData, langFilename)
    case "coffescript":
      return coffeescriptFormatting(kataData, langFilename)
    default:
      //! CATCHALL - Should not ever hit this!  Provides a default return or break for TS
      console.error(`Error from processCodeStrings(...) in ${path.basename(__filename)}`)
      throw Error(`LANGUAGE NOT FOUND while formatting strings for ${kataData.slug} in ${kataData.curLang}`)
  }
}

function typescriptFormatting(kataData: any, langFilename: string): any {
  // ?TypeScript specific formatting
  // CODE STRING - Reformat export, imports & test config for local use

  slashCommentPreprocess(kataData)

  // Remove existing exports on top level const & functions & any object exports
  kataData.code = kataData?.code.replace(/^export\s(?:(?:default\s)?(?=(?:const|let|var|function))|({.*)?$)/g, "")
  // Append export object that includes all top level const and/or function names
  kataData.code = `${kataData?.code}\n\nexport { ${(
    kataData?.code?.match(/(?<=(?:^const|^function|^class)\s)(\w+)(?=(?:\s=\s\(|\s?\())/gm) || ["UNKNOWN"]
  )?.join(", ")} }`

  // TEST STRING - Reformat export, imports & test config for local use

  // Remove any existing reference to Test.
  // currentKataData.tests = currentKataData?.tests.replace(/\bTest\./g, "")
  // Replace assertions with Chai types
  // currentKataData.tests = currentKataData?.tests.replace(/assert.equal/g, "assert.strictEqual")
  // Remove any existing reference to require/import chai or ./solution
  kataData.tests = kataData?.tests.replace(/^.*(?:chai).*$/gm, "").replace(/^.*(?:"\.\/).*$/gm, "")
  // Insert import for Chai & CODE file/module
  kataData.tests = `\nimport { assert } from ("chai")\nimport { ${
    (kataData?.tests.match(/(?<=(?:assert|expect)\.\w+(?:\s|\s?\())(\w+)(?=(?:\s|\s?\())/) || ["UNKNOWN"])[0]
  } } from ("./${langFilename}")\n\n${kataData?.tests}\n`

  return slashCommentReturn(kataData)
}

function javascriptFormatting(kataData: any, langFilename: string): any {
  //? JavaScript specific formatting
  // CODE STRING - Reformat export, imports & test config for local use

  slashCommentPreprocess(kataData)

  // Append export object that includes all top level const and/or function names
  kataData.code = `${kataData?.code}\n\nmodule.exports = { ${(
    kataData?.code?.match(/(?:(?<=(?:^const|^function|^class)\s)(\w+)(?=(?:\s=\s\(|\s?\()))|^\w+(?=\s=[\s\n]+\()/gm) || [
      "UNKNOWN"
    ]
  )?.join(", ")} }`

  // TEST STRING - Reformat export, imports & test config for local use
  // Remove any existing reference to require/import chai or ./solution
  kataData.tests = kataData?.tests.replace(/^.*(?:chai).*$/gm, "").replace(/^.*(?:"\.\/).*$/gm, "")
  // Replace assertions with Chai types
  kataData.tests = kataData?.tests
    .replace(/expectError/g, "assert.throws")
    .replace(/expectNoError/g, "assert.doesNotThrow")
    .replace(/assertEquals/g, "assert.strictEqual")
    .replace(/(assertDeepEquals|assertSimilar)/g, "assert.deepEqual")
    .replace(/assertNotSimilar/g, "assert.notDeepEqual")
    .replace(/assertNotEquals/g, "assert.notStrictEqual")
    .replace(/(assertFuzzyEquals|assertApproxEquals)/g, "assert.approximately")
    .replace(/\bTest.log\b/g, "console.log")
  // Check for use of old Codewars JS Framework utility methods to a filtered array of any utilities present
  const cwUtilMethods = ["randomNumber", "randomToken", "randomize", "sample", "inspect"].filter((util) =>
    new RegExp(`Test.${util}`).test(kataData?.tests)
  )
  // Insert import for Chai, old Codewars framework utilities & CODE file/module
  kataData.tests = `${
    cwUtilMethods.length ? `\nconst { ${cwUtilMethods.join(", ")} } = require("../../../utils/cwUtils")` : ""
  }\nconst { assert${/Test.expect/.test(kataData?.tests) ? ", expect" : ""} } = require("chai")\nconst { ${
    (kataData?.tests.match(/(?<=(?:assert|expect)\.\w+(?:\s|\s?\())(\w+)(?=(?:\s|\s?\())/) || ["UNKNOWN"])[0]
  } } = require("./${langFilename}")\n\n${kataData?.tests}\n`
  // Remove any existing reference to Test
  kataData.tests = kataData?.tests.replace(/\bTest\./g, "")

  return slashCommentReturn(kataData)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function swiftFormatting(kataData: any, langFilename: string): any {
  //? Swift specific formatting
  // CODE STRING - Reformat export, imports & test config for local use
  slashCommentPreprocess(kataData)

  // TEST STRING - Reformat export, imports & test config for local use
  return slashCommentReturn(kataData)
}

function pythonFormatting(kataData: any, langFilename: string): any {
  //? Python specific formatting
  // CODE STRING - Reformat export, imports & test config for local use

  hashCommentPreprocess(kataData)

  // TEST STRING - Reformat export, imports & test config for local use
  // Remove any existing import of Codewars framework & import of "solution" module
  kataData.tests = kataData?.tests.replace(/import codewars_test as test/g, "").replace(/from solution import \w+/g, "")
  // Insert import for Codewars python test framework & import CODE module to TEST
  kataData.tests = `import codewars_test as test\nfrom ${langFilename} import ${
    (kataData?.tests?.match(/(?<=equals\()(\w+)(?=\()/) || ["UNKNOWN"])[0]
  }\n\n\n${kataData.tests}`

  return hashCommentReturn(kataData)
}

function coffeescriptFormatting(kataData: any, langFilename: string): any {
  //? CoffeeScript specific formatting
  // CODE STRING - Reformat export, imports & test config for local use

  kataData = hashCommentPreprocess(kataData)

  // Append export group of top level declarations
  kataData.code = `${kataData?.code}\n\nmodule.exports = { ${
    kataData?.code?.match(/^(\w+)(?=(?:\s=\s\(\w+).*(?:->|=>))/gm) || ["UNKNOWN"]?.join(", ")
  } }`
  // TEST STRING - Reformat export, imports & test config for local use
  // Remove any existing reference to Test
  kataData.tests = kataData?.tests.replace(/\bTest\./g, "")
  // Replace assertions with Chai types
  kataData.tests = kataData?.tests
    .replace(/assertEquals/g, "assert.strictEqual")
    .replace(/(assertDeepEquals|assertSimilar)/g, "assert.deepEqual")
  // Insert import for Chai & CODE file/module
  kataData.tests = `\n{ assert } = require "chai"\n{ ${
    (kataData?.tests.match(/(?<=assert\.\w+(?:\s|\s?\())(\w+)(?=(?:\s|\)|\())/) || ["UNKNOWN"])[0]
  } } = require "./${langFilename}"\n\n${kataData?.tests}\n`

  return hashCommentReturn(kataData)
}
function slashCommentPreprocess(kataData: any): any {
  //? COMMON to all DOUBLE FORWARD SLASH COMMENT languages
  // TEST STRING - Reformat export, imports & test config for local use
  // Remove initial any default comment block
  kataData.tests = kataData?.tests.replace(/^(?:(?:\/\/|\/\*).*|\n|\r|\u2028|\u2029|\*\/)*(?=\w)/, "")
  // Remove any trailing default comment block
  kataData.tests = kataData?.tests.replace(/(?<=.\n|\r|\u2028|\u2029)(?:(?:\/\/|\/\*).*|\n|\r|\u2028|\u2029|\*\/)*(?=$)/, "")
  return kataData
}

function slashCommentReturn(kataData: any): any {
  // Return formatted header & reconfigured CODE || TEST strings for DOUBLE FORWARD SLASH COMMENT languages
  const codeBlockStrings = ["code", "test"].map(
    (flag) =>
      `//+ ${"=".repeat(116)}\n//+\n//+ ${kataData?.rank?.name} - ${kataData?.name}  [ ID: ${kataData?.id} ] (${
        kataData?.slug
      })\n//+ URL: ${kataData.url}\n//+ Category: ${kataData?.category?.toUpperCase()}  |  Tags: ${
        kataData?.tags?.join(" | ").toUpperCase() || "NONE"
      }\n//+\n//+ ${"=".repeat(116)}\n\n${(flag === "code" ? kataData?.code : kataData?.tests) || ""}\n`
  )
  return Object.assign(kataData, { code: codeBlockStrings[0], tests: codeBlockStrings[1] })
}

function hashCommentPreprocess(kataData: any): any {
  //? COMMON to all HASH COMMENT languages
  // TEST STRING - Reformat export, imports & test config for local use
  // Remove initial any default comment block
  kataData.tests = kataData?.tests.replace(/^#(?:.|[\n\r\u2028\u2029#])*?(?=[\w`'"]{2,})(?<=[\n\r\u2028\u2029#])/, "")
  // Remove any trailing default comment block
  kataData.tests = kataData?.tests.replace(/(?<=.\n|\r|\u2028|\u2029)(?:#.*|\n|\r|\u2028|\u2029)*(?=$)/, "")
  return kataData
}

function hashCommentReturn(kataData: any): any {
  // Return formatted header & reconfigured CODE || TEST strings for HASH COMMENT languages
  const codeBlockStrings = ["code", "test"].map(
    (flag) =>
      `#+ ${"=".repeat(117)}\n#+\n#+ ${kataData?.rank?.name} - ${kataData?.name}  [ ID: ${kataData?.id} ] (${
        kataData?.slug
      })\n#+ URL: ${kataData.url}\n#+ Category: ${kataData?.category?.toUpperCase() || "NONE"}  |  Tags: ${
        kataData?.tags?.join(" | ").toUpperCase() || "NONE"
      }\n#+\n#+ ${"=".repeat(117)}\n\n${(flag === "code" ? kataData?.code : kataData?.tests) || ""}\n`
  )
  return Object.assign(kataData, { code: codeBlockStrings[0], tests: codeBlockStrings[1] })
}