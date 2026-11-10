"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, ExternalLink, FileText, Layers, Plus, SquarePen, Trash2 } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Bar, Card, CardHead, Check, Cta, Field, HeadLink, Modal, useToast } from "@/components/ui";
import { SCREEN_VERSES } from "@/lib/content";
import { dayMonth, toDateKey } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import type { Book } from "@/lib/types";
import { BIBLE_VERSIONS, bibleChapterUrl } from "@/lib/bibleLinks";
import { deleteFile, getFile, putFile } from "@/lib/files";
import { uid } from "@/lib/id";
import { useAppState } from "@/store/StoreProvider";
import {
  addReflection,
  bibleStatus,
  bookStatus,
  completeBibleToday,
  completeBookToday,
  currentBook,
  deleteBook,
  finishCurrentBook,
  moveBook,
  queuedBooks,
  saveBook,
  setCurrentBook,
  undoBibleToday,
  undoBookToday,
} from "@/store/logic";

export default function Leitura() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const now = useNow();
  const today = toDateKey(now);
  const [modal, setModal] = useState<null | "plan" | "history" | "book" | "queue" | "done">(null);
  const [reflection, setReflection] = useState("");

  const bible = bibleStatus(s, today);
  const bibleUrl = bibleChapterUrl(s.bible.book, bible.completedToday ? s.bible.currentUnit - 1 : s.bible.currentUnit, s.bible.version);
  const book = currentBook(s);
  const bs = bookStatus(s, book, today);
  const queue = queuedBooks(s);
  const allDone = bible.completedToday && (!book || bs?.completedToday || bs?.finished);

  const saveReflection = () => {
    const t = reflection.trim();
    if (!t) return;
    mutate((d) => addReflection(d, t, "bible", bible.todayLabel));
    setReflection("");
    toast("Reflexão registrada.");
  };

  return (
    <>
      <Hero title="Leitura" sub="Leitura diária com propósito" quote={SCREEN_VERSES.leitura} />
      <div className="sheet">
        <Card>
          <CardHead
            title="Bíblia"
            icon={<BookOpen size={30} strokeWidth={1.6} aria-hidden="true" />}
            action={<HeadLink onClick={() => setModal("plan")}>Ver plano</HeadLink>}
          />
          <div className="bible-cols">
            <div>
              <div className="kicker">Plano atual</div>
              <div className="strong">{s.bible.title}</div>
            </div>
            <span className="divider" />
            <div>
              <div className="kicker">Leitura de hoje</div>
              <div className="strong">
                {bible.finished && !bible.completedToday ? "Plano concluído" : bible.todayLabel}
                {bible.completedToday && <span style={{ color: "var(--green)" }}> ✓</span>}
              </div>
            </div>
          </div>
          <div className="progress-line">
            <Bar value={bible.pct} label="Progresso do plano bíblico" />
            <span className="meta">
              {bible.done} de {bible.total} capítulos
            </span>
          </div>
          {bibleUrl && !bible.finished && (
            <a className="btn sm read-out" href={bibleUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={16} /> Ler {bible.todayLabel} no app da Bíblia ({s.bible.version ?? "NVI"})
            </a>
          )}
          {bible.completedToday && (
            <p className="card-sub" style={{ marginTop: 8 }}>
              Capítulo de hoje concluído.{" "}
              <button type="button" className="inline-link" onClick={() => mutate((d) => undoBibleToday(d, today))}>
                Desfazer
              </button>
            </p>
          )}
        </Card>

        <Card>
          <CardHead
            title="Reflexão"
            icon={<SquarePen size={30} strokeWidth={1.6} aria-hidden="true" />}
            action={<HeadLink onClick={() => setModal("history")}>Ver histórico</HeadLink>}
          />
          <p className="card-sub" style={{ margin: "-4px 0 10px" }}>
            O que Deus falou comigo hoje?
          </p>
          <div className="reflect-box">
            <textarea
              value={reflection}
              rows={1}
              placeholder="Escreva aqui a sua reflexão..."
              aria-label="Sua reflexão"
              onChange={(e) => setReflection(e.target.value)}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
            />
            <button type="button" className="icon-btn" aria-label="Salvar reflexão" onClick={saveReflection} disabled={!reflection.trim()}>
              <ChevronRight size={22} />
            </button>
          </div>
        </Card>

        <Card>
          <CardHead
            title="Livro atual"
            icon={<BookOpen size={30} strokeWidth={1.6} aria-hidden="true" />}
            action={<HeadLink onClick={() => setModal("book")}>Ver detalhes</HeadLink>}
          />
          {book && bs ? (
            <div className="book-wrap">
              <BookCover book={book} />
              <div style={{ minWidth: 0 }}>
                <h3 className="book-title">{book.title}</h3>
                <p className="card-sub">{book.pagesPerDay} páginas por dia</p>
                <div className="kicker" style={{ marginTop: 14 }}>
                  Leitura de hoje
                </div>
                <div className="strong">
                  {bs.finished ? "Livro concluído" : `Páginas ${bs.from} – ${bs.to}`}
                  {bs.completedToday && <span style={{ color: "var(--green)" }}> ✓</span>}
                </div>
                <div className="progress-line" style={{ marginTop: 10 }}>
                  <Bar value={bs.pct ?? 0} label="Progresso do livro" />
                  <span className="meta">{bs.pct != null ? `${bs.pct}% concluído` : `pág. ${book.currentPage}`}</span>
                </div>
                {(book.link || book.file) && (
                  <div className="read-actions">
                    {book.link && (
                      <a className="btn sm read-out" href={book.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={16} /> {linkLabel(book.link)}
                      </a>
                    )}
                    {book.file && (
                      <button type="button" className="btn sm read-out" onClick={() => void openBookFile(book, toast)}>
                        <FileText size={16} /> Ler arquivo
                      </button>
                    )}
                  </div>
                )}
                {bs.needsSetup && (
                  <button type="button" className="inline-link" style={{ marginTop: 10, fontSize: 14.5 }} onClick={() => setModal("book")}>
                    Definir título e total de páginas
                  </button>
                )}
                {bs.completedToday && (
                  <p className="card-sub" style={{ marginTop: 8 }}>
                    <button type="button" className="inline-link" onClick={() => mutate((d) => undoBookToday(d, today))}>
                      Desfazer leitura de hoje
                    </button>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="empty">
              Nenhum livro em andamento.{" "}
              <button type="button" onClick={() => setModal(queue.length ? "queue" : "book")}>
                {queue.length ? "Escolher da biblioteca" : "Adicionar livro"}
              </button>
            </div>
          )}
        </Card>

        <Card>
          <CardHead
            title="Biblioteca futura"
            sub="Livros que você pretende ler em seguida."
            icon={<Layers size={30} strokeWidth={1.6} aria-hidden="true" />}
            action={<HeadLink onClick={() => setModal("queue")}>Ver todos</HeadLink>}
          />
          {queue.length === 0 ? (
            <div className="empty">
              Sua fila está vazia.{" "}
              <button type="button" onClick={() => setModal("queue")}>
                Adicionar livros
              </button>
            </div>
          ) : (
            <ul className="list">
              {queue.slice(0, 3).map((b, i) => (
                <li className="queue-row" key={b.id}>
                  <span className="num muted">{i + 1}</span>
                  <span className="queue-title">{b.title}</span>
                  <span className="queue-author">{b.author}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Cta onClick={() => setModal("done")} tagline="Pequenas leituras. Grandes transformações." disabled={Boolean(allDone)}>
          {allDone ? "Leitura de hoje concluída" : "Marcar leitura como concluída"}
        </Cta>
      </div>

      <Modal open={modal === "plan"} onClose={() => setModal(null)} title="Plano bíblico">
        {modal === "plan" && <PlanEditor onClose={() => setModal(null)} />}
      </Modal>

      <Modal open={modal === "history"} onClose={() => setModal(null)} title="Reflexões">
        {s.reflections.length === 0 ? (
          <p className="empty">Nenhuma reflexão ainda. Escreva a primeira na tela de Leitura.</p>
        ) : (
          <ul className="list">
            {s.reflections.map((r) => (
              <li key={r.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                <div className="card-sub" style={{ marginTop: 0 }}>
                  {dayMonth(r.createdAt.slice(0, 10))} · {r.sourceLabel}
                </div>
                <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{r.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={modal === "book"} onClose={() => setModal(null)} title={book ? "Livro atual" : "Novo livro"}>
        {modal === "book" && <BookEditor book={book} onClose={() => setModal(null)} />}
      </Modal>

      <Modal open={modal === "queue"} onClose={() => setModal(null)} title="Biblioteca futura">
        {modal === "queue" && <QueueEditor />}
      </Modal>

      <Modal open={modal === "done"} onClose={() => setModal(null)} title="Leitura de hoje">
        {modal === "done" && <DoneSheet onClose={() => setModal(null)} />}
      </Modal>
    </>
  );
}

function linkLabel(url: string) {
  const u = url.toLowerCase();
  if (u.includes("skeelo")) return "Continuar no Skeelo";
  if (u.includes("kindle") || u.includes("amazon")) return "Continuar no Kindle";
  if (u.includes("play.google")) return "Continuar no Google Play Livros";
  if (u.includes("kobo")) return "Continuar no Kobo";
  return "Continuar lendo";
}

/** Abre o arquivo guardado neste aparelho (PDF no visualizador; EPUB no app de leitura do celular). */
async function openBookFile(book: Book, toast: (t: string) => void) {
  if (!book.file) return;
  const blob = await getFile(book.file.id).catch(() => undefined);
  if (!blob) {
    toast("O arquivo não está neste aparelho. Adicione de novo em “Ver detalhes”.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  if (book.file.type !== "application/pdf") a.download = book.file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function BookCover({ book }: { book: Book }) {
  return (
    <div className="book-cover" aria-hidden="true">
      <span className="t">{book.title}</span>
      {book.author && <span className="a">{book.author}</span>}
      <svg className="mtn" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path d="M0,34 L18,20 L30,28 L46,12 L62,26 L78,16 L100,30 L100,60 L0,60 Z" fill="#8c9aa0" />
        <path d="M0,44 L22,34 L44,42 L64,32 L84,40 L100,36 L100,60 L0,60 Z" fill="#53666c" />
        <path d="M0,52 L100,48 L100,60 L0,60 Z" fill="#3a4b51" />
        <g transform="translate(50 52) scale(0.08)" fill="#e8ece9">
          <polygon points="0,-48 -6,-6 6,-6" />
          <polygon points="0,48 -6,6 6,6" />
          <polygon points="-48,0 -6,-6 -6,6" />
          <polygon points="48,0 6,-6 6,6" />
        </g>
      </svg>
    </div>
  );
}

function PlanEditor({ onClose }: { onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const today = toDateKey();
  const st = bibleStatus(s, today);
  const [title, setTitle] = useState(s.bible.title);
  const [bookName, setBookName] = useState(s.bible.book);
  const [total, setTotal] = useState(s.bible.totalUnits);
  const [current, setCurrent] = useState(s.bible.currentUnit);
  const [version, setVersion] = useState(s.bible.version ?? "NVI");

  return (
    <div>
      <div className="chapter-grid" style={{ marginBottom: 16 }}>
        {Array.from({ length: s.bible.totalUnits }, (_, i) => i + 1).map((n) => {
          const done = n < s.bible.currentUnit;
          const isToday = !st.completedToday && n === s.bible.currentUnit;
          return (
            <span key={n} className={`chapter ${done ? "done" : ""} ${isToday ? "today" : ""}`} aria-label={`Capítulo ${n}${done ? " lido" : ""}`}>
              {n}
            </span>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const tot = Math.max(1, Number(total) || 1);
          mutate((d) => {
            d.bible.title = title.trim() || d.bible.title;
            d.bible.book = bookName.trim() || d.bible.book;
            d.bible.totalUnits = tot;
            d.bible.currentUnit = Math.max(1, Math.min(Number(current) || 1, tot + 1));
            d.bible.version = version;
          });
          toast("Plano atualizado.");
          onClose();
        }}
      >
        <Field label="Nome do plano">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="Livro bíblico">
            <input className="input" value={bookName} onChange={(e) => setBookName(e.target.value)} />
          </Field>
          <Field label="Total de capítulos">
            <input className="input" type="number" inputMode="numeric" min={1} value={total} onChange={(e) => setTotal(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Próximo capítulo a ler">
          <input className="input" type="number" inputMode="numeric" min={1} value={current} onChange={(e) => setCurrent(Number(e.target.value))} />
        </Field>
        <Field label="Versão para abrir no app da Bíblia (YouVersion)">
          <select className="select" value={version} onChange={(e) => setVersion(e.target.value)}>
            {BIBLE_VERSIONS.map((v) => (
              <option key={v.abbr} value={v.abbr}>
                {v.abbr} — {v.name}
              </option>
            ))}
          </select>
        </Field>
        {!bibleChapterUrl(bookName, 1) && bookName.trim() && (
          <p className="card-sub" style={{ marginTop: -4 }}>
            Não reconheci “{bookName}”. Escreva o nome do livro bíblico por extenso (ex.: João, Salmos, 1 Coríntios) para o botão do app da Bíblia aparecer.
          </p>
        )}
        <button type="submit" className="btn primary block">
          Salvar plano
        </button>
      </form>
    </div>
  );
}

function normalizeLink(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function BookEditor({ book, onClose }: { book?: Book; onClose: () => void }) {
  const { mutate } = useAppState();
  const toast = useToast();
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [total, setTotal] = useState<string>(book?.totalPages ? String(book.totalPages) : "");
  const [page, setPage] = useState<string>(String(book?.currentPage ?? 0));
  const [perDay, setPerDay] = useState<string>(String(book?.pagesPerDay ?? 10));
  const [link, setLink] = useState(book?.link ?? "");
  const [file, setFile] = useState<Book["file"]>(book?.file ?? null);
  const [newFile, setNewFile] = useState<File | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const data = {
          title: title.trim(),
          author: author.trim(),
          totalPages: total ? Math.max(1, Number(total)) : null,
          currentPage: Math.max(0, Number(page) || 0),
          pagesPerDay: Math.max(1, Number(perDay) || 10),
          link: normalizeLink(link),
          file: newFile ? { id: uid(), name: newFile.name, type: newFile.type || (newFile.name.toLowerCase().endsWith(".epub") ? "application/epub+zip" : "application/pdf") } : file,
        };
        if (newFile && data.file) void putFile(data.file.id, newFile).catch(() => toast("Não consegui guardar o arquivo neste aparelho."));
        if (book?.file && book.file.id !== data.file?.id) void deleteFile(book.file.id).catch(() => {});
        mutate((d) => {
          if (book) saveBook(d, { ...data, id: book.id });
          else {
            saveBook(d, { ...data, status: "queued" });
            const created = d.books[d.books.length - 1];
            setCurrentBook(d, created.id);
          }
        });
        toast("Livro salvo.");
        onClose();
      }}
    >
      <Field label="Título">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Autor (opcional)">
        <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Total de páginas">
          <input className="input" type="number" inputMode="numeric" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <Field label="Páginas lidas">
          <input className="input" type="number" inputMode="numeric" min={0} value={page} onChange={(e) => setPage(e.target.value)} />
        </Field>
      </div>
      <Field label="Meta de páginas por dia">
        <input className="input" type="number" inputMode="numeric" min={1} value={perDay} onChange={(e) => setPerDay(e.target.value)} />
      </Field>
      <Field label="Onde estou lendo (link do Skeelo, Kindle ou site)">
        <input className="input" type="text" inputMode="url" autoCapitalize="none" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole aqui o link do livro" />
      </Field>
      <Field label="Arquivo do livro (PDF ou EPUB sem proteção)" group>
        {file || newFile ? (
          <div className="chips">
            <span className="chip" aria-pressed="true">
              <FileText size={16} /> {newFile?.name ?? file?.name}
            </span>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => {
                setNewFile(null);
                setFile(null);
              }}
            >
              Remover
            </button>
          </div>
        ) : (
          <label className="btn sm" style={{ width: "fit-content" }}>
            <FileText size={16} /> Escolher arquivo
            <input
              type="file"
              accept=".pdf,.epub,application/pdf,application/epub+zip"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 60 * 1024 * 1024) {
                  toast("Arquivo muito grande (máximo 60 MB).");
                  return;
                }
                setNewFile(f);
              }}
            />
          </label>
        )}
        <small className="field-hint">Fica guardado só neste aparelho. Livros comprados em lojas (Skeelo, Kindle) são protegidos e só abrem no app delas — para esses, use o link acima.</small>
      </Field>
      <button type="submit" className="btn primary block">
        Salvar
      </button>
      {book && (
        <button
          type="button"
          className="btn ghost block"
          style={{ marginTop: 8 }}
          onClick={() => {
            mutate((d) => finishCurrentBook(d));
            toast("Livro concluído. Parabéns!");
            onClose();
          }}
        >
          Concluí este livro
        </button>
      )}
    </form>
  );
}

function QueueEditor() {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const queue = queuedBooks(s);
  const done = s.books.filter((b) => b.status === "completed");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  return (
    <div>
      {queue.length === 0 && <p className="empty">Nenhum livro na fila.</p>}
      <ul className="list">
        {queue.map((b, i) => (
          <li key={b.id} className="row">
            <span className="num muted">{i + 1}</span>
            <span className="row-main">
              {b.title}
              {b.author && <small>{b.author}</small>}
            </span>
            <button type="button" className="icon-btn" aria-label="Subir" onClick={() => mutate((d) => moveBook(d, b.id, -1))} disabled={i === 0}>
              <ArrowUp size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Descer" onClick={() => mutate((d) => moveBook(d, b.id, 1))} disabled={i === queue.length - 1}>
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                mutate((d) => setCurrentBook(d, b.id));
                toast(`“${b.title}” agora é o livro atual.`);
              }}
            >
              Ler agora
            </button>
            <button type="button" className="icon-btn" aria-label={`Remover ${b.title}`} onClick={() => mutate((d) => deleteBook(d, b.id))}>
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="card"
        style={{ padding: 12, marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          mutate((d) => saveBook(d, { title: title.trim(), author: author.trim(), status: "queued" }));
          setTitle("");
          setAuthor("");
        }}
      >
        <Field label="Título">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Autor (opcional)">
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </Field>
        <button type="submit" className="btn block">
          <Plus size={18} /> Adicionar à fila
        </button>
      </form>
      {done.length > 0 && (
        <>
          <h3 style={{ fontSize: 17, margin: "16px 0 6px" }}>Concluídos</h3>
          <ul className="list">
            {done.map((b) => (
              <li key={b.id} className="row">
                <span className="row-main">
                  {b.title}
                  {b.author && <small>{b.author}</small>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function DoneSheet({ onClose }: { onClose: () => void }) {
  const { s, mutate } = useAppState();
  const toast = useToast();
  const today = toDateKey();
  const bible = bibleStatus(s, today);
  const book = currentBook(s);
  const bs = bookStatus(s, book, today);
  const canBible = !bible.completedToday && !bible.finished;
  const canBook = Boolean(book && bs && !bs.completedToday && !bs.finished);
  const [doBible, setDoBible] = useState(canBible);
  const [doBook, setDoBook] = useState(canBook);

  return (
    <div>
      <ul className="list">
        <li className="row">
          <span className="row-main">
            Bíblia
            <small>{bible.completedToday ? `${bible.todayLabel} já concluído` : bible.finished ? "Plano concluído" : bible.todayLabel}</small>
          </span>
          <Check checked={doBible || bible.completedToday} label="Concluir capítulo de hoje" onChange={() => canBible && setDoBible((v) => !v)} />
        </li>
        <li className="row">
          <span className="row-main">
            {book?.title ?? "Livro"}
            <small>
              {!book ? "Nenhum livro atual" : bs?.completedToday ? "Meta de hoje já concluída" : bs?.finished ? "Livro concluído" : `Páginas ${bs?.from} – ${bs?.to}`}
            </small>
          </span>
          <Check checked={doBook || Boolean(bs?.completedToday)} label="Concluir páginas de hoje" onChange={() => canBook && setDoBook((v) => !v)} />
        </li>
      </ul>
      <button
        type="button"
        className="btn primary block"
        style={{ marginTop: 14 }}
        disabled={!(doBible && canBible) && !(doBook && canBook)}
        onClick={() => {
          mutate((d) => {
            if (doBible && canBible) completeBibleToday(d, today);
            if (doBook && canBook) completeBookToday(d, undefined, today);
          });
          toast("Leitura registrada. Pequenas leituras, grandes transformações.");
          onClose();
        }}
      >
        Confirmar
      </button>
    </div>
  );
}
