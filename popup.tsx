import { useEffect, useState } from "react";



import { Storage } from "@plasmohq/storage";





const storage = new Storage()

type PromptType = {
  id: number
  title: string
  prompt: string
}

export default function IndexPopup() {

  const [conversation, setConversation] = useState("")
  const [output, setOutput] = useState("")

  const [prompts, setPrompts] = useState<PromptType[]>([])

  const [showForm, setShowForm] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newPrompt, setNewPrompt] = useState("")


  /* LOAD PROMPTS */

  useEffect(() => {

    async function loadPrompts() {

      const saved = await storage.get<PromptType[]>("prompts")

      if (saved) {
        setPrompts(saved)
      }

    }

    loadPrompts()

  }, [])


  /* SAVE PROMPTS */

  async function savePrompts(updated: PromptType[]) {

    await storage.set("prompts", updated)

    setPrompts(updated)

  }

  async function deletePrompt(id: number) {
    const updated = prompts.filter((p) => p.id !== id)

    await savePrompts(updated)
  }


  /* ADD PROMPT */

  async function addPrompt() {

    if (!newTitle || !newPrompt) return

    const updated = [

      ...prompts,

      {
        id: Date.now(),
        title: newTitle,
        prompt: newPrompt
      }

    ]

    await savePrompts(updated)

    setNewTitle("")
    setNewPrompt("")

    setShowForm(false)

  }


  /* CALL GROK */

  async function runPrompt(p: PromptType) {
    if (!conversation) {
      setOutput("Please paste conversation first.")

      return
    }

    setOutput("Generating response...")

    try {
      const finalPrompt = `
${p.prompt}

Conversation:
${conversation}
`

      const response = await fetch(
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

      const data = await response.json()

      console.log("groq response", data)

      if (!response.ok) {
        setOutput("API Error:\n" + JSON.stringify(data, null, 2))

        return
      }

      setOutput(data.choices?.[0]?.message?.content || "No response returned")
    } catch (error) {
      console.log(error)

      setOutput("Request failed. Check console.")
    }
  }
  return (

      <div style={styles.container}>

        <h2 style={styles.title}>
          AI Support Assistant
        </h2>

        <textarea
            placeholder="Paste support conversation..."
            value={conversation}
            onChange={(e)=>setConversation(e.target.value)}
            style={styles.textarea}
        />

        <div style={styles.promptGrid}>

          {
            prompts.map(p=>(

                <div key={p.id} style={styles.chipWrapper}>

                  <button
                      style={styles.chip}
                      onClick={()=>runPrompt(p)}
                  >
                    {p.title}
                  </button>

                  <span
                      onClick={()=>deletePrompt(p.id)}
                      style={styles.deleteIcon}
                  >
×
</span>

                </div>

            ))
          }

        </div>


        {
            showForm && (

                <div style={styles.card}>

                  <input
                      placeholder="Button name"
                      value={newTitle}
                      onChange={(e)=>setNewTitle(e.target.value)}
                      style={styles.input}
                  />

                  <textarea
                      placeholder="Prompt instructions..."
                      value={newPrompt}
                      onChange={(e)=>setNewPrompt(e.target.value)}
                      style={styles.textareaSmall}
                  />

                  <div style={{display:"flex", gap:8}}>

                    <button
                        onClick={addPrompt}
                        style={styles.primaryBtn}
                    >
                      Save Prompt
                    </button>

                    <button
                        onClick={()=>{
                          setShowForm(false)
                          setNewTitle("")
                          setNewPrompt("")
                        }}
                        style={styles.secondaryBtn}
                    >
                      Cancel
                    </button>

                  </div>

                </div>

            )
        }


        {
            output && (

                <div style={styles.outputCard}>

                  <div style={styles.outputHeader}>

                    <span>AI Output</span>

                    <button
                        onClick={()=>navigator.clipboard.writeText(output)}
                        style={styles.copyBtn}
                    >
                      Copy
                    </button>

                  </div>

                  <div style={styles.outputText}>

                    {output}

                  </div>

                </div>

            )
        }


        <button
            onClick={()=>setShowForm(!showForm)}
            style={styles.addBtn}
        >
          + Add Prompt
        </button>


      </div>

  )

}



const styles: any = {
  container: {
    width: 380,

    minHeight: 520,

    padding: 16,

    background: "#f8fafc",

    fontFamily: "system-ui"
  },

  title: {
    fontSize: 18,

    fontWeight: 600,

    marginBottom: 12
  },

  textarea: {
    width: "100%",

    height: 110,

    padding: 10,

    borderRadius: 10,

    border: "1px solid #e2e8f0",

    marginBottom: 12,

    fontSize: 13,

    background: "#fff"
  },

  textareaSmall: {
    width: "100%",

    height: 70,

    padding: 8,

    borderRadius: 8,

    border: "1px solid #e2e8f0",

    marginBottom: 8,

    fontSize: 13
  },

  textareaOutput: {
    width: "100%",

    height: 130,

    padding: 10,

    borderRadius: 10,

    border: "1px solid #e2e8f0",

    fontSize: 13,

    background: "#fff"
  },

  buttonRow: {
    display: "flex",

    flexWrap: "wrap",

    gap: 6,

    marginBottom: 12
  },

  primaryBtn: {
    background: "#2563eb",

    color: "#fff",

    border: "none",

    padding: "6px 10px",

    borderRadius: 8,

    fontSize: 13,

    cursor: "pointer"
  },

  secondaryBtn: {
    background: "#e2e8f0",

    border: "none",

    padding: "6px 10px",

    borderRadius: 8,

    fontSize: 13,

    cursor: "pointer"
  },

  card: {
    border: "1px solid #e2e8f0",

    padding: 10,

    borderRadius: 10,

    marginBottom: 12,

    background: "#fff"
  },

  input: {
    width: "100%",

    padding: 8,

    borderRadius: 8,

    border: "1px solid #e2e8f0",

    marginBottom: 8
  },

  promptItem: {
    display: "flex",
    alignItems: "center",
    gap: 4
  },

  deleteBtn: {
    background: "#fee2e2",
    border: "none",
    color: "#b91c1c",
    padding: "4px 6px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12
  },
  promptGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },

  chipWrapper: {
    display: "flex",
    alignItems: "center",
    background: "#eef2ff",
    borderRadius: 20,
    padding: "2px 6px"
  },

  chip: {
    border: "none",
    background: "transparent",
    padding: "4px 8px",
    fontSize: 13,
    cursor: "pointer"
  },

  deleteIcon: {
    fontSize: 12,
    cursor: "pointer",
    color: "#6b7280",
    padding: "0 4px"
  },

  outputCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    background: "#fff",
    marginBottom: 12
  },

  outputHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 500
  },

  outputText: {
    fontSize: 13,
    whiteSpace: "pre-wrap",
    lineHeight: 1.4
  },

  copyBtn: {
    border: "none",
    background: "#f1f5f9",
    padding: "4px 8px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12
  },

  addBtn: {
    width: "100%",
    border: "1px dashed #c7d2fe",
    background: "#f8fafc",
    padding: "8px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 13
  }
}