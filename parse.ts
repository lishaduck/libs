/** Comments */
const COMMENTS = /<!--[\s\S]*?-->/g

/** XML declaration tags (<?xml ?>) */
const DECLARATION_OPEN = /^<[?]xml /
const DECLARATION_CLOSE = /^[?]>/

/** CDATA (<![CDATA[ ]]) */
const CDATA = /^<!\[CDATA\[(?<content>[\s\S]*)\]\]>/m

/** Tags (<tag attr="value">content</tag>) */
const TAG_OPEN = /^<(?<tag>[\w-:.]+)/
const TAG_SELFCLOSE = /^(?<selfclosed>\/?)>/
const TAG_CLOSE = (tag:string) => new RegExp(`^<\/\\s*${tag}\\s*>`)
const TAG_ATTRIBUTES = /^(?<name>[\w:-]+)\s*=\s*(?<quote>["'])(?<value>[\s\S]+?)\k<quote>/
const TAG_CONTENT = /^(?<content>[^<]*?)(?=<)/

/** XML entities */
const ENTITIES = {"&lt;":"<", "&gt;":">", "&apos;":"'", "&quot;":'"', "&amp;":"&"}
const ENTITIES_DEC = /&#(?<code>\d+);/g
const ENTITIES_HEX = /&#x(?<code>\d+);/g

/** XML document */
type Document = {xml:string}

/** XML node */
type Node = {$tag:string, $:string, [key:string]:unknown}

/** Parser options */
type ParserOptions = {
  includeDeclaration?:boolean
  includeDoctype?:boolean
  reviveBooleans?:boolean
  reviveNumbers?:boolean
  emptyToNull?:boolean
  reviver?:(key:string, value:string, tag:string) => unknown
}

/** Parser */
export function parse(xml:string, options = {}) {
  return format({xml:parseXML({xml}, options)}, options).xml
}

/** Parse a XML document */
function parseXML(document:Document, {includeDeclaration = false}:ParserOptions) {

  // Trim and remove comments
  const parsed = {} as {[key:string]:unknown}
  document.xml = document.xml.trim().replace(COMMENTS, "")

  // Handle XML declaration (optional as per spec)
  if (peek(document, DECLARATION_OPEN)) {

    // Handle XML opening declaration
    consume(document, DECLARATION_OPEN)

    // Extract XML declaration attributes
    while (peek(document, TAG_ATTRIBUTES)) {
      const {name, value} = consume(document, TAG_ATTRIBUTES)
      if (includeDeclaration)
        parsed[`@${name}`] = value
    }

    // Handle XML closing declaration
    consume(document, DECLARATION_CLOSE)
  }

  // Parse root node
  const {$tag:tag, ...properties} = parseNode(document) as Node
  parsed[tag] = properties

  // Handle multiple root nodes
  if (peek(document, TAG_OPEN))
    throw new Error(`Failed to parse XML, multiple root nodes are not supported`)

  return parsed
}

/** Parse a single node */
function parseNode(document:Document) {

  // Handle opening tag
  if (!peek(document, TAG_OPEN))
    return null
  const node = {$tag:consume(document, TAG_OPEN).tag, $:""} as Node

  // Extract tag attributes
  while (peek(document, TAG_ATTRIBUTES)) {
    const {name, value} = consume(document, TAG_ATTRIBUTES)
    node[`@${name}`] = value
  }

  // Handle self-closing tag
  if (consume(document, TAG_SELFCLOSE).selfclosed)
    return node

  // Extract content
  let content = ""
  while (true) {
    content += consume(document, TAG_CONTENT).content ?? ""
    if (peek(document, CDATA)) {
      content += consume(document, CDATA).content ?? ""
      continue
    }
    break
  }
  node.$ = content.trim()

  // Extract child nodes
  if (!peek(document, TAG_CLOSE(node.$tag))) {
    while (true) {
      const child = parseNode(document)
      if (!child)
        break
      const {$tag:tag, ...properties} = child
      node[tag] ??= []
      ;(node[tag] as unknown[]).push(properties)
    }
  }

  // Handle closing tag
  consume(document, TAG_CLOSE(node.$tag))
  return node
}

/** Check next token */
function peek(document:Document, regex:RegExp) {
  return regex.test(document.xml)
}

/** Consume next token and extract matching groups */
function consume(document:Document, regex:RegExp) {
  const matched = document.xml.match(regex)
  if (!matched)
    throw new Error(`Failed to parse XML, expected token: ${regex.source}`)
  document.xml = document.xml.replace(regex, "").trimStart()
  return matched.groups ?? {}
}

/** Format resulting document */
function format(result:{[key:string]:unknown}, options:ParserOptions) {
  for (let [key, value] of Object.entries(result)) {
    //Un-array single nodes
    if ((Array.isArray(value))&&(value.length === 1))
      result[key] = value = value.shift()

    //Handle node objects
    if (typeof value === "object") {
      const node = value as Node
      const keys = Object.keys(node)

      // Un-object single key objects
      if ((keys.length === 1)&&(keys[0] === "$")) {
        result[key] = revive(node.$, options)
        continue
      }

      //
      if (keys.filter(k => k.charAt(0) !== "@").length > 1) {
        delete (value as any).$
      }

      result[key] = format(value as {[key:string]:unknown}, options)
    }
    //Handle terminal values
    else
      result[key] = revive(value as string, options)
  }
  return result
}

/** Default reviver */
function revive(value:string, {reviveBooleans = true, reviveNumbers = true, emptyToNull = true}:ParserOptions) {
  switch (true) {
    // Convert empty values to null
    case emptyToNull && /^\s*$/.test(value):
      return null
    // Revive booleans
    case reviveBooleans && /^(?:true|false)$/i.test(value):
      return /^true$/i.test(value)
    // Revive numbers
    case reviveNumbers && Number.isFinite(Number(value)):
      return Number.parseFloat(value)
    // Unescape XML entities
    default:
      value = value
        .replace(ENTITIES_DEC, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(ENTITIES_HEX, (_, code) => String.fromCharCode(parseInt(code, 16)))
      for (let entity in ENTITIES)
        value = value.replaceAll(entity, ENTITIES[entity as keyof typeof ENTITIES])
      return value
  }
}