import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"

const storage = new Storage()

type PromptType = {
  id: number
  title: string
  prompt: string
}

export default function IndexPopup() {
  const [conversation, setConversation] = useState("")
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [prompts, setPrompts] = useState<PromptType[]>([])

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [newTitle, setNewTitle] = useState("")
  const [newPrompt, setNewPrompt] = useState("")

  /* TIMEZONE */

  const offsets: any = {
    IST: 5.5,
    EST: -5,
    CST: -6,
    PST: -8
  }

  const [zoneTimes, setZoneTimes] = useState<any>({
    IST: new Date(),
    EST: new Date(),
    CST: new Date(),
    PST: new Date()
  })

  function syncTimes(baseZone: string, newDate: Date) {
    const utc = newDate.getTime() - offsets[baseZone] * 3600000

    const updated: any = {}

    Object.keys(offsets).forEach((z) => {
      updated[z] = new Date(utc + offsets[z] * 3600000)
    })

    setZoneTimes(updated)
  }

  /* auto detect IST time */

  useEffect(() => {
    const now = new Date()

    syncTimes("IST", now)

    const timer = setInterval(() => {
      syncTimes("IST", new Date())
    }, 10000)

    return () => clearInterval(timer)
  }, [])

  function formatTime(d: Date) {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
  }

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    })
  }

  function parseTime(value: string, zone: string) {
    if (!value.includes(":")) return

    const parts = value.split(" ")

    if (parts.length < 2) return

    let [time, ampm] = parts

    let [h, m] = time.split(":")

    let hour = parseInt(h)

    if (ampm === "PM" && hour < 12) hour += 12
    if (ampm === "AM" && hour === 12) hour = 0

    const d = new Date(zoneTimes[zone])

    d.setHours(hour)
    d.setMinutes(parseInt(m))

    syncTimes(zone, d)
  }

  /* STORAGE */

  useEffect(() => {
    async function load() {
      const saved = await storage.get<PromptType[]>("prompts")

      if (saved) setPrompts(saved)
    }

    load()
  }, [])

  async function savePrompts(updated: PromptType[]) {
    await storage.set("prompts", updated)

    setPrompts(updated)
  }

  /* PROMPT CRUD */

  async function addPrompt() {
    if (!newTitle || !newPrompt) return

    let updated

    if (editId) {
      updated = prompts.map((p) =>
        p.id === editId ? { ...p, title: newTitle, prompt: newPrompt } : p
      )
    } else {
      updated = [
        ...prompts,

        {
          id: Date.now(),
          title: newTitle,
          prompt: newPrompt
        }
      ]
    }

    await savePrompts(updated)

    setNewTitle("")
    setNewPrompt("")
    setEditId(null)

    setShowForm(false)
  }

  async function deletePrompt(id: number) {
    const updated = prompts.filter((p) => p.id !== id)

    await savePrompts(updated)
  }

  function editPrompt(p: PromptType) {
    setEditId(p.id)

    setNewTitle(p.title)

    setNewPrompt(p.prompt)

    setShowForm(true)
  }

  /* AI CALL */

  async function runPrompt(p: PromptType) {
    if (!conversation) {
      setOutput("Paste conversation first")

      return
    }

    setLoading(true)
    setCopied(false)

    try {
      const finalPrompt = `

${p.prompt}

Conversation:
${conversation}

`

      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${process.env.PLASMO_PUBLIC_GROQ_API_KEY}`
          },

          body: JSON.stringify({
            model: "llama-3.1-8b-instant",

            messages: [
              {
                role: "user",
                content: finalPrompt
              }
            ]
          })
        }
      )

      const data = await res.json()

      setOutput(data.choices?.[0]?.message?.content || "No response")
    } catch {
      setOutput("API error")
    }

    setLoading(false)
  }

  /* COPY */

  function copyOutput() {
    navigator.clipboard.writeText(output)

    setCopied(true)

    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>echo</h2>

      <textarea
        placeholder="Paste support conversation..."
        value={conversation}
        onChange={(e) => setConversation(e.target.value)}
        style={styles.textarea}
      />

      <div style={styles.promptGrid}>
        {prompts.map((p) => (
          <div key={p.id} style={styles.chipWrapper}>
            <button style={styles.chip} onClick={() => runPrompt(p)}>
              {p.title}
            </button>

            <span style={styles.iconSmall} onClick={() => editPrompt(p)}>
              ✎
            </span>

            <span style={styles.iconSmall} onClick={() => deletePrompt(p.id)}>
              ✕
            </span>
          </div>
        ))}
      </div>

      {loading && <div style={styles.loader} />}

      {output && !loading && (
        <div style={styles.outputCard}>
          <div style={styles.outputHeader}>
            <span>Response</span>

            <button onClick={copyOutput} style={styles.iconBtn}>
              {copied ? "✓" : "📋"}
            </button>
          </div>

          <div style={styles.outputText}>{output}</div>
        </div>
      )}

      {showForm && (
        <div style={styles.card}>
          <input
            placeholder="Button name"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={styles.input}
          />

          <textarea
            placeholder="Prompt instructions"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            style={styles.textareaSmall}
          />

          <div style={styles.row}>
            <button onClick={addPrompt} style={styles.primaryBtn}>
              Save
            </button>

            <button
              onClick={() => {
                setShowForm(false)

                setEditId(null)
              }}
              style={styles.secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
        + Add Prompt
      </button>

      <button
        onClick={() => {
          setConversation("")
          setOutput("")
        }}
        style={styles.resetBtn}>
        Reset
      </button>

      <div style={styles.timeCard}>
        <div style={styles.timeTitle}>Timezone</div>

        <div style={styles.timeGrid}>
          {Object.keys(zoneTimes).map((zone) => (
            <div key={zone} style={styles.timeBox}>
              <div style={styles.zoneLabel}>{zone}</div>

              <div style={styles.dateText}>{formatDate(zoneTimes[zone])}</div>

              <input
                value={formatTime(zoneTimes[zone])}
                onChange={(e) => parseTime(e.target.value, zone)}
                style={styles.timeInput}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles: any = {
  container: {
    width: 460,

    padding: 14,

    background: "#f8fafc",

    fontFamily: "system-ui"
  },

  title: {
    fontSize: 18,

    fontWeight: 600,

    marginBottom: 10
  },

  textarea: {
    width: "100%",

    height: 110,

    padding: 10,

    borderRadius: 10,

    border: "1px solid #e2e8f0",

    marginBottom: 10,

    fontSize: 13,

    boxSizing: "border-box"
  },

  promptGrid: {
    display: "flex",

    flexWrap: "wrap",

    gap: 6,

    marginBottom: 10
  },

  chipWrapper: {
    display: "flex",

    alignItems: "center",

    background: "#eef2ff",

    borderRadius: 20,

    padding: "5px 10px"
  },

  chip: {
    border: "none",

    background: "transparent",

    padding: "4px 6px",

    cursor: "pointer",

    fontSize: 12
  },

  iconSmall: {
    fontSize: 11,

    cursor: "pointer",

    padding: "0 3px",

    color: "#666"
  },

  outputCard: {
    border: "1px solid #e5e7eb",

    borderRadius: 12,

    padding: 10,

    background: "#fff",

    marginBottom: 10,

    boxSizing: "border-box"
  },

  outputHeader: {
    display: "flex",

    justifyContent: "space-between",

    marginBottom: 6,

    fontSize: 12
  },

  outputText: {
    whiteSpace: "pre-wrap",

    fontSize: 13,

    lineHeight: 1.6
  },

  iconBtn: {
    border: "none",

    background: "#f1f5f9",

    padding: "2px 6px",

    borderRadius: 6,

    cursor: "pointer"
  },

  loader: {
    width: 18,
    height: 18,
    border: "2px solid #ddd",
    borderTop: "2px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "8px auto"
  },

  card: {
    border: "1px solid #e5e7eb",

    padding: 10,

    borderRadius: 12,

    marginBottom: 10,

    background: "#fff",

    boxSizing: "border-box"
  },

  input: {
    width: "100%",

    padding: 6,

    marginBottom: 6,

    fontSize: 12
  },

  textareaSmall: {
    width: "100%",

    height: 60,

    marginBottom: 6,

    fontSize: 12
  },

  row: {
    display: "flex",

    gap: 6
  },

  primaryBtn: {
    background: "#6366f1",

    color: "#fff",

    border: "none",

    padding: "4px 8px",

    borderRadius: 8,

    fontSize: 12
  },

  secondaryBtn: {
    background: "#eee",

    border: "none",

    padding: "4px 8px",

    borderRadius: 8,

    fontSize: 12
  },

  addBtn: {
    width: "100%",

    border: "1px dashed #c7d2fe",

    padding: 6,

    borderRadius: 10,

    fontSize: 12,

    marginBottom: 6
  },

  resetBtn: {
    width: "100%",

    padding: 5,

    borderRadius: 8,

    border: "1px solid #eee",

    fontSize: 12,

    marginBottom: 10
  },

  timeCard: {
    border: "1px solid #e5e7eb",

    borderRadius: 12,

    padding: 8,

    background: "#fff"
  },

  timeTitle: {
    fontSize: 12,

    marginBottom: 6,

    fontWeight: 500
  },

  timeGrid: {
    display: "grid",

    gridTemplateColumns: "repeat(4,1fr)",

    gap: 4
  },

  timeBox: {
    border: "1px solid #eee",

    borderRadius: 8,

    padding: 4,

    textAlign: "center"
  },

  zoneLabel: {
    fontSize: 10,

    color: "#666"
  },

  dateText: {
    fontSize: 10
  },

  timeInput: {
    border: "none",

    fontSize: 11,

    textAlign: "center",

    width: "100%",

    outline: "none"
  }
}
