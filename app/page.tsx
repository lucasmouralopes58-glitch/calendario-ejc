"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
type Evento = {
  id: number;
  titulo: string;
  data: string;
  horario: string;
  local: string;
  descricao?: string | null;
  criado_em?: string;
};

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const mesesAbrev = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

export default function Home() {
  const agora = new Date();

  const [mesAtual, setMesAtual] = useState(agora.getMonth());
  const [anoAtual, setAnoAtual] = useState(agora.getFullYear());

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [eventoSelecionado, setEventoSelecionado] =
    useState<Evento | null>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [manterConectado, setManterConectado] = useState(true);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");

  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);

  /* =========================
     AUTENTICAÇÃO
  ========================= */

  useEffect(() => {
    verificarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
      setCarregandoUsuario(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function verificarUsuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const lembrar = localStorage.getItem("ejc_manter_conectado");

    if (user && lembrar === "false") {
      await supabase.auth.signOut();
      setUsuario(null);
    } else {
      setUsuario(user);
    }

    setCarregandoUsuario(false);
  }

  async function entrar() {
    if (!email || !senha) {
      alert("Preencha o e-mail e a senha.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert("E-mail ou senha incorretos.");
      console.error(error);
      return;
    }

    localStorage.setItem(
      "ejc_manter_conectado",
      manterConectado ? "true" : "false"
    );

    setMostrarLogin(false);
    setEmail("");
    setSenha("");
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  /* =========================
     EVENTOS
  ========================= */

  useEffect(() => {
    carregarEventos();
  }, [mesAtual, anoAtual]);

  async function carregarEventos() {
    const primeiroDia = new Date(anoAtual, mesAtual, 1)
      .toISOString()
      .split("T")[0];

    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0)
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .gte("data", primeiroDia)
      .lte("data", ultimoDia)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEventos(data || []);
  }

  function abrirNovoEvento() {
    setEventoEditando(null);
    setTitulo("");
    setData("");
    setHorario("");
    setLocal("");
    setDescricao("");
    setMostrarFormulario(true);
  }

  function abrirEditarEvento(evento: Evento) {
    setEventoEditando(evento);

    setTitulo(evento.titulo);
    setData(evento.data);
    setHorario(evento.horario?.slice(0, 5) || "");
    setLocal(evento.local);
    setDescricao(evento.descricao || "");

    setMostrarFormulario(true);
  }

  async function salvarEvento() {
    if (!titulo || !data || !horario || !local) {
      alert("Preencha título, data, horário e local.");
      return;
    }

    if (eventoEditando) {
      const { error } = await supabase
        .from("eventos")
        .update({
          titulo,
          data,
          horario,
          local,
          descricao,
        })
        .eq("id", eventoEditando.id);

      if (error) {
        console.error(error);
        alert("Não foi possível editar o evento.");
        return;
      }
    } else {
      const { error } = await supabase.from("eventos").insert({
        titulo,
        data,
        horario,
        local,
        descricao,
      });

      if (error) {
        console.error(error);
        alert("Não foi possível criar o evento.");
        return;
      }
    }

    setMostrarFormulario(false);
    carregarEventos();
  }

  async function excluirEvento(id: number) {
    const confirmar = confirm("Deseja realmente excluir este evento?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Não foi possível excluir o evento.");
      return;
    }

    setEventoSelecionado(null);
    carregarEventos();
  }

  /* =========================
     NAVEGAÇÃO
  ========================= */

  function mesAnterior() {
    if (mesAtual === 0) {
      setMesAtual(11);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  }

  function proximoMes() {
    if (mesAtual === 11) {
      setMesAtual(0);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  }

  /* =========================
     DATAS
  ========================= */

  function formatarData(dataEvento: string) {
    const [ano, mes, dia] = dataEvento.split("-").map(Number);

    return {
      dia,
      mes: mesesAbrev[mes - 1],
      dataCompleta: `${dia} de ${meses[mes - 1]} de ${ano}`,
    };
  }

  function calcularDias(dataEvento: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [ano, mes, dia] = dataEvento.split("-").map(Number);

    const dataAlvo = new Date(ano, mes - 1, dia);
    dataAlvo.setHours(0, 0, 0, 0);

    const diferenca =
      dataAlvo.getTime() - hoje.getTime();

    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  }

  const eventosDoMes = useMemo(() => {
    return eventos;
  }, [eventos]);

  const proximoEvento = eventosDoMes.length > 0
    ? eventosDoMes[0]
    : null;

  /* =========================
     WHATSAPP
  ========================= */

  function compartilharWhatsApp() {
    const mensagem =
      "📅 *Calendário EJC*\n\n" +
      "Confira os próximos eventos e tudo que acontece no EJC:\n\n" +
      window.location.href;

    const url =
      `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  if (carregandoUsuario) {
    return (
      <main className="loading-screen">
        <div className="loading-logo">
          EJC
        </div>
      </main>
    );
  }

  return (
    <main className="page">

      {/* =========================
          DECORAÇÕES DOURADAS
      ========================= */}

      <div className="decor decorTopLeft">
        <svg viewBox="0 0 300 360">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 315 C45 250, 35 190, 80 135 C110 98, 150 78, 182 52" />
            <path d="M65 246 C43 214, 28 181, 32 143" />
            <path d="M90 206 C120 178, 138 151, 151 119" />

            <path d="M76 157 C44 141, 26 115, 27 91 C28 66, 50 53, 70 63 C90 73, 94 96, 82 116" />
            <path d="M78 157 C110 141, 130 114, 128 89 C126 64, 104 52, 84 63 C65 74, 63 98, 75 117" />

            <path d="M76 157 C60 136, 60 110, 76 97 C91 84, 111 91, 116 108 C121 126, 104 145, 76 157" />

            <path d="M65 246 C37 235, 18 218, 13 198 C35 193, 57 204, 65 246" />
            <path d="M89 206 C111 205, 132 192, 142 174 C118 169, 98 180, 89 206" />
          </g>
        </svg>
      </div>

      <div className="decor decorTopRight">
        <svg viewBox="0 0 260 240">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
          >
            <path d="M245 20 C205 50, 188 90, 184 135 C181 168, 192 196, 217 218" />
            <path d="M210 73 C190 65, 172 67, 160 79 C178 91, 196 90, 210 73" />
            <path d="M190 133 C210 121, 226 122, 239 135 C220 148, 202 147, 190 133" />
            <path d="M183 176 C163 165, 146 168, 135 182 C153 192, 171 190, 183 176" />

            <path d="M216 54 C225 48, 236 50, 240 59 C244 68, 238 77, 229 81 C221 75, 216 65, 216 54Z" />
          </g>
        </svg>
      </div>

      <div className="decor decorBottomLeft">
        <svg viewBox="0 0 260 300">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 285 C42 246, 68 223, 74 183 C79 151, 66 124, 39 104" />
            <path d="M74 183 C104 167, 125 142, 130 111" />
            <path d="M57 221 C36 211, 20 194, 18 174 C39 174, 56 192, 57 221" />
            <path d="M88 162 C108 160, 125 149, 136 131 C115 127, 97 138, 88 162" />

            <path d="M47 76 C48 52, 62 34, 80 29 C84 51, 72 69, 47 76" />
            <path d="M47 76 C27 68, 15 53, 15 37 C32 39, 46 53, 47 76" />
          </g>
        </svg>
      </div>

      <div className="decor decorBottomRight">
        <svg viewBox="0 0 300 340">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M285 330 C258 285, 248 247, 259 205 C270 162, 252 124, 215 95" />

            <path d="M252 244 C226 229, 208 205, 207 179 C231 183, 250 204, 252 244" />

            <path d="M257 205 C281 190, 293 166, 289 143 C268 148, 255 172, 257 205" />

            <path d="M215 95 C190 82, 174 59, 176 36 C198 41, 215 63, 215 95" />

            <path d="M216 95 C239 85, 252 64, 250 43 C229 48, 216 68, 216 95" />

            <path d="M195 137 C207 125, 209 109, 203 97 C190 107, 187 123, 195 137" />

            <path d="M207 179 C188 166, 172 165, 159 176 C176 188, 193 188, 207 179" />
          </g>
        </svg>
      </div>

      {/* pequenos brilhos */}

      <span className="goldStar star1">✦</span>
      <span className="goldStar star2">✦</span>
      <span className="goldStar star3">✦</span>
      <span className="goldStar star4">✦</span>
      <span className="goldStar star5">✦</span>

      {/* =========================
          CONTEÚDO
      ========================= */}

      <div className="content">

        {/* HEADER */}

        <header className="header">

          <div className="brand">

            <div className="logoArea">
              <img
                src="/logo-ejc.png"
                alt="EJC - Encontro de Jovens com Cristo"
                className="logo"
              />
            </div>

            <div className="brandDivider" />

            <div className="titleArea">
              <span className="smallTitle">
                CALENDÁRIO DE
              </span>

              <h1>Eventos</h1>

              <span className="subtitle">
                ENCONTRO DE JOVENS COM CRISTO
              </span>

              <div className="titleDecoration">
                <span />
                <b>♡</b>
                <span />
              </div>
            </div>

          </div>

          <div className="headerButtons">

            <button
              className="outlineButton"
              onClick={compartilharWhatsApp}
            >
              <span>✦</span>
              Compartilhar
            </button>

            {usuario ? (
              <>
                <button
                  className="outlineButton"
                  onClick={abrirNovoEvento}
                >
                  + Novo evento
                </button>

                <button
                  className="outlineButton"
                  onClick={sair}
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                className="outlineButton"
                onClick={() => setMostrarLogin(true)}
              >
                ♟ Acesso dos CGs
              </button>
            )}

          </div>

        </header>

        {/* =========================
            PRÓXIMO EVENTO
        ========================= */}

        {proximoEvento && (
          <section
            className="featuredEvent"
            onClick={() => setEventoSelecionado(proximoEvento)}
          >

            <div className="featuredDate">

              <div className="nextBadge">
                PRÓXIMO EVENTO
              </div>

              <strong>
                {formatarData(proximoEvento.data).dia}
              </strong>

              <span className="featuredMonth">
                {formatarData(proximoEvento.data).mes}
              </span>

              <div className="featuredInfo">
                <span>
                  ◷ {proximoEvento.horario.slice(0, 5)}
                </span>

                <span>
                  ♢ {proximoEvento.local}
                </span>
              </div>

            </div>

            <div className="featuredContent">

              <h2>{proximoEvento.titulo}</h2>

              <p>
                {proximoEvento.descricao ||
                  "Um encontro especial de oração, comunhão e muita alegria."}
              </p>

              <div className="daysBadge">
                ◷{" "}
                {calcularDias(proximoEvento.data) > 0
                  ? `Faltam ${calcularDias(proximoEvento.data)} dias`
                  : calcularDias(proximoEvento.data) === 0
                  ? "É hoje!"
                  : "Evento realizado"}
              </div>

            </div>

          </section>
        )}

        {/* =========================
            MÊS
        ========================= */}

        <section className="monthSection">

          <div className="monthNavigation">

            <button
              className="monthArrow"
              onClick={mesAnterior}
            >
              ‹
            </button>

            <div className="monthTitle">
              <h2>{meses[mesAtual]}</h2>

              <span>{anoAtual}</span>
            </div>

            <button
              className="monthArrow"
              onClick={proximoMes}
            >
              ›
            </button>

          </div>

          <p className="monthDescription">
            Confira tudo o que acontece no EJC neste mês.
          </p>

          <div className="monthDecoration">
            <span />
            <b>♡</b>
            <span />
          </div>

        </section>

        {/* =========================
            EVENTOS
        ========================= */}

        {eventosDoMes.length === 0 ? (

          <div className="emptyState">

            <div className="emptySymbol">✦</div>

            <h3>
              Nenhum evento neste mês
            </h3>

            <p>
              Em breve teremos novidades por aqui.
            </p>

            {usuario && (
              <button
                className="goldButton"
                onClick={abrirNovoEvento}
              >
                Adicionar evento
              </button>
            )}

          </div>

        ) : (

          <section className="eventsGrid">

            {eventosDoMes.map((evento) => {

              const info = formatarData(evento.data);

              return (
                <article
                  key={evento.id}
                  className="eventCard"
                  onClick={() =>
                    setEventoSelecionado(evento)
                  }
                >

                  <div className="cardTop">

                    <div>
                      <strong>
                        {info.dia}
                      </strong>

                      <span>
                        {info.mes}
                      </span>
                    </div>

                    <div className="timeBox">
                      <small>
                        HORÁRIO:
                      </small>

                      <b>
                        {evento.horario.slice(0, 5)}
                      </b>
                    </div>

                  </div>

                  <h3>
                    {evento.titulo}
                  </h3>

                  <p>
                    {evento.descricao ||
                      "Evento do EJC. Clique para visualizar todos os detalhes."}
                  </p>

                  <div className="cardBottom">
                    <span>
                      ♢ {evento.local}
                    </span>

                    <b>→</b>
                  </div>

                </article>
              );
            })}

          </section>

        )}

        {/* =========================
            RODAPÉ
        ========================= */}

        <footer className="footer">

          <div className="footerDecoration">
            <span />
            <b>♡</b>
            <span />
          </div>

          <p>
            EJC • Encontro de Jovens com Cristo
          </p>

          <small>
            Paróquia de Sant’Ana do Barroso
          </small>

        </footer>

      </div>

      {/* =========================
          MODAL EVENTO
      ========================= */}

      {eventoSelecionado && (

        <div
          className="modalOverlay"
          onClick={() => setEventoSelecionado(null)}
        >

          <div
            className="eventModal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="closeButton"
              onClick={() => setEventoSelecionado(null)}
            >
              ×
            </button>

            <span className="modalLabel">
              EVENTO DO EJC
            </span>

            <h2>
              {eventoSelecionado.titulo}
            </h2>

            <div className="modalDivider" />

            <div className="modalInfo">

              <div>
                <small>DATA</small>
                <strong>
                  {formatarData(eventoSelecionado.data).dataCompleta}
                </strong>
              </div>

              <div>
                <small>HORÁRIO</small>
                <strong>
                  {eventoSelecionado.horario.slice(0, 5)}
                </strong>
              </div>

              <div>
                <small>LOCAL</small>
                <strong>
                  {eventoSelecionado.local}
                </strong>
              </div>

            </div>

            {eventoSelecionado.descricao && (
              <p className="modalDescription">
                {eventoSelecionado.descricao}
              </p>
            )}

            {usuario && (
              <div className="modalActions">

                <button
                  className="editButton"
                  onClick={() => {
                    abrirEditarEvento(eventoSelecionado);
                    setEventoSelecionado(null);
                  }}
                >
                  Editar
                </button>

                <button
                  className="deleteButton"
                  onClick={() =>
                    excluirEvento(eventoSelecionado.id)
                  }
                >
                  Excluir
                </button>

              </div>
            )}

          </div>

        </div>

      )}

      {/* =========================
          LOGIN
      ========================= */}

      {mostrarLogin && (

        <div
          className="modalOverlay"
          onClick={() => setMostrarLogin(false)}
        >

          <div
            className="loginModal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="closeButton"
              onClick={() => setMostrarLogin(false)}
            >
              ×
            </button>

            <div className="loginSymbol">
              ✦
            </div>

            <span className="modalLabel">
              ÁREA RESTRITA
            </span>

            <h2>
              Acesso dos CGs
            </h2>

            <p>
              Entre para gerenciar os eventos do EJC.
            </p>

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) =>
                setSenha(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  entrar();
                }
              }}
            />

            <label className="rememberLogin">
              <input
                type="checkbox"
                checked={manterConectado}
                onChange={(e) =>
                  setManterConectado(e.target.checked)
                }
              />
              <span>Manter conectado</span>
            </label>

            <button
              className="loginButton"
              onClick={entrar}
            >
              Entrar
            </button>

          </div>

        </div>

      )}

      {/* =========================
          FORMULÁRIO
      ========================= */}

      {mostrarFormulario && (

        <div
          className="modalOverlay"
          onClick={() => setMostrarFormulario(false)}
        >

          <div
            className="formModal"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="closeButton"
              onClick={() =>
                setMostrarFormulario(false)
              }
            >
              ×
            </button>

            <span className="modalLabel">
              ACESSO DOS CGs
            </span>

            <h2>
              {eventoEditando
                ? "Editar evento"
                : "Novo evento"}
            </h2>

            <div className="formGrid">

              <label>
                Título
                <input
                  value={titulo}
                  onChange={(e) =>
                    setTitulo(e.target.value)
                  }
                  placeholder="Ex.: Encontro do EJC"
                />
              </label>

              <label>
                Data
                <input
                  type="date"
                  value={data}
                  onChange={(e) =>
                    setData(e.target.value)
                  }
                />
              </label>

              <label>
                Horário
                <input
                  type="time"
                  value={horario}
                  onChange={(e) =>
                    setHorario(e.target.value)
                  }
                />
              </label>

              <label>
                Local
                <input
                  value={local}
                  onChange={(e) =>
                    setLocal(e.target.value)
                  }
                  placeholder="Ex.: Matriz Sant'Ana"
                />
              </label>

              <label className="full">
                Descrição
                <textarea
                  value={descricao}
                  onChange={(e) =>
                    setDescricao(e.target.value)
                  }
                  placeholder="Digite uma breve descrição do evento..."
                  rows={4}
                />
              </label>

            </div>

            <button
              className="saveButton"
              onClick={salvarEvento}
            >
              {eventoEditando
                ? "Salvar alterações"
                : "Adicionar evento"}
            </button>

          </div>

        </div>

      )}

      <style jsx global>{`

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap');

        :root {
          --blue: #08295f;
          --blue-dark: #061f4c;
          --blue-card: #0b3676;
          --gold: #e7ad2f;
          --gold-light: #f4c94f;
          --white: #ffffff;
          --text: #0a2b5c;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          font-family: "DM Sans", sans-serif;
          background: var(--blue);
          color: white;
        }

        button,
        input,
        textarea {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(25, 74, 145, .28),
              transparent 36%
            ),
            linear-gradient(
              135deg,
              #071f4b 0%,
              #092b64 50%,
              #061f4c 100%
            );
        }

        /* =========================
           DECORAÇÕES
        ========================= */

        .decor {
          position: absolute;
          color: rgba(231, 173, 47, .52);
          pointer-events: none;
          z-index: 1;
        }

        .decor svg {
          width: 100%;
          height: 100%;
        }

        .decorTopLeft {
          width: 260px;
          height: 320px;
          left: -25px;
          top: 80px;
        }

        .decorTopRight {
          width: 230px;
          height: 230px;
          right: -5px;
          top: 170px;
        }

        .decorBottomLeft {
          width: 220px;
          height: 270px;
          left: -10px;
          bottom: 20px;
        }

        .decorBottomRight {
          width: 270px;
          height: 320px;
          right: -5px;
          bottom: -15px;
        }

        .goldStar {
          position: absolute;
          color: var(--gold);
          font-size: 16px;
          z-index: 2;
          opacity: .9;
        }

        .star1 {
          left: 20%;
          top: 25%;
        }

        .star2 {
          right: 20%;
          top: 28%;
        }

        .star3 {
          left: 10%;
          top: 65%;
          font-size: 12px;
        }

        .star4 {
          right: 11%;
          top: 70%;
          font-size: 13px;
        }

        .star5 {
          left: 50%;
          bottom: 12%;
          font-size: 10px;
        }

        /* =========================
           CONTEÚDO
        ========================= */

        .content {
          position: relative;
          z-index: 5;
          width: min(1120px, calc(100% - 50px));
          margin: 0 auto;
          padding: 40px 0 60px;
        }

        /* =========================
           HEADER
        ========================= */

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 55px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .logoArea {
          width: 200px;
          min-width: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo {
  width: 200px;
  height: auto;
  transform: translateY(-25px);
}
        .brandDivider {
          width: 1px;
          height: 95px;
          background: rgba(231, 173, 47, .7);
        }

        .titleArea {
          padding-top: 3px;
        }

        .smallTitle {
          display: block;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 7px;
          color: white;
          margin-bottom: 1px;
        }

        .titleArea h1 {
          margin: 0;
          color: var(--gold-light);
          font-family: "Playfair Display", serif;
          font-size: clamp(62px, 7vw, 88px);
          line-height: .95;
          font-style: italic;
          font-weight: 500;
        }

        .subtitle {
          display: block;
          margin-top: 10px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 4px;
          color: white;
        }

        .titleDecoration {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 24px;
        }

        .titleDecoration span {
          width: 155px;
          height: 1px;
          background: rgba(231, 173, 47, .8);
        }

        .titleDecoration b {
          color: var(--gold);
          font-size: 19px;
          font-weight: 400;
        }

        .headerButtons {
          display: flex;
          gap: 10px;
          padding-top: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .outlineButton {
          border: 1px solid var(--gold);
          background: rgba(6, 31, 76, .3);
          color: white;
          border-radius: 30px;
          padding: 10px 17px;
          font-size: 12px;
          font-weight: 700;
          transition: .2s ease;
        }

        .outlineButton:hover {
          background: var(--gold);
          color: #08295f;
          transform: translateY(-20px);
        }

        /* =========================
           DESTAQUE
        ========================= */

        .featuredEvent {
          display: grid;
          grid-template-columns: 195px 1fr;
          min-height: 195px;
          background: white;
          border: 1px solid var(--gold);
          border-radius: 22px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 15px 40px rgba(0, 0, 0, .16);
          transition: .25s ease;
        }

        .featuredEvent:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 45px rgba(0, 0, 0, .22);
        }

        .featuredDate {
          position: relative;
          background: linear-gradient(
            160deg,
            #0d3979,
            #092b62
          );
          padding: 42px 24px 22px;
          display: flex;
          flex-direction: column;
        }

        .nextBadge {
          position: absolute;
          left: 16px;
          top: 0;
          background: var(--gold-light);
          color: #08295f;
          padding: 9px 16px;
          border-radius: 0 0 12px 12px;
          font-size: 9px;
          font-weight: 800;
        }

        .featuredDate strong {
          font-size: 64px;
          line-height: .9;
          color: white;
          font-weight: 800;
        }

        .featuredMonth {
          color: var(--gold-light);
          font-size: 19px;
          font-weight: 800;
          margin-top: 7px;
        }

        .featuredInfo {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
          color: white;
          font-size: 10px;
          font-weight: 600;
        }

        .featuredContent {
          position: relative;
          padding: 38px 42px;
          color: var(--text);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .featuredContent h2 {
          margin: 0 0 10px;
          font-size: 27px;
          font-weight: 500;
        }

        .featuredContent p {
          max-width: 650px;
          margin: 0 0 18px;
          font-size: 14px;
          line-height: 1.6;
          color: #35537d;
        }

        .daysBadge {
          width: fit-content;
          border: 1px solid var(--gold);
          border-radius: 25px;
          color: #9a6b00;
          padding: 8px 15px;
          font-size: 11px;
          font-weight: 700;
        }

        /* =========================
           MÊS
        ========================= */

        .monthSection {
          text-align: center;
          padding: 35px 0 27px;
        }

        .monthNavigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 25px;
        }

        .monthArrow {
          width: 43px;
          height: 43px;
          border-radius: 50%;
          border: 1px solid var(--gold);
          background: transparent;
          color: var(--gold-light);
          font-size: 32px;
          line-height: 1;
          transition: .2s ease;
        }

        .monthArrow:hover {
          background: var(--gold);
          color: #08295f;
        }

        .monthTitle h2 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 59px;
          font-style: italic;
          font-weight: 500;
          color: var(--gold-light);
          line-height: 1;
        }

        .monthTitle span {
          display: block;
          margin-top: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 7px;
        }

        .monthDescription {
          margin: 14px 0 0;
          color: rgba(255,255,255,.88);
          font-size: 12px;
        }

        .monthDecoration {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 23px;
        }

        .monthDecoration span {
          width: 180px;
          height: 1px;
          background: rgba(231, 173, 47, .75);
        }

        .monthDecoration b {
          color: var(--gold);
          font-size: 17px;
          font-weight: 400;
        }

        /* =========================
           CARDS
        ========================= */

        .eventsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .eventCard {
          background: #fff;
          color: var(--text);
          border-radius: 17px;
          border: 1px solid rgba(231, 173, 47, .65);
          padding: 16px;
          min-height: 225px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(0,0,0,.12);
          transition: .22s ease;
        }

        .eventCard:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 30px rgba(0,0,0,.18);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .cardTop > div:first-child strong {
          display: block;
          font-size: 39px;
          line-height: .9;
          color: #0b3979;
        }

        .cardTop > div:first-child span {
          display: block;
          color: var(--gold);
          font-size: 12px;
          font-weight: 800;
          margin-top: 6px;
        }

        .timeBox {
          background: var(--gold-light);
          border-radius: 10px;
          padding: 7px 12px;
          min-width: 82px;
          color: #08295f;
        }

        .timeBox small {
          display: block;
          font-size: 7px;
          font-weight: 800;
        }

        .timeBox b {
          display: block;
          font-size: 13px;
          margin-top: 2px;
        }

        .eventCard h3 {
          margin: 22px 0 7px;
          font-size: 18px;
          font-weight: 600;
        }

        .eventCard p {
          margin: 0;
          font-size: 11px;
          line-height: 1.55;
          color: #526987;
          min-height: 42px;
        }

        .cardBottom {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid #e8edf3;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #426082;
          font-size: 10px;
          font-weight: 600;
        }

        .cardBottom b {
          color: var(--gold);
          font-size: 19px;
        }

        /* =========================
           EMPTY
        ========================= */

        .emptyState {
          text-align: center;
          padding: 50px 20px;
          border: 1px solid rgba(231,173,47,.35);
          border-radius: 20px;
          background: rgba(255,255,255,.04);
        }

        .emptySymbol {
          color: var(--gold);
          font-size: 28px;
        }

        .emptyState h3 {
          margin: 12px 0 5px;
          font-size: 20px;
        }

        .emptyState p {
          margin: 0 0 20px;
          color: rgba(255,255,255,.7);
          font-size: 13px;
        }

        .goldButton {
          border: 0;
          background: var(--gold);
          color: #08295f;
          padding: 11px 20px;
          border-radius: 25px;
          font-weight: 800;
        }

        /* =========================
           FOOTER
        ========================= */

        .footer {
          text-align: center;
          padding: 45px 0 0;
        }

        .footerDecoration {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .footerDecoration span {
          width: 140px;
          height: 1px;
          background: rgba(231,173,47,.5);
        }

        .footerDecoration b {
          color: var(--gold);
          font-size: 18px;
          font-weight: 400;
        }

        .footer p {
          margin: 17px 0 5px;
          font-size: 10px;
          letter-spacing: 2px;
          font-weight: 700;
        }

        .footer small {
          color: rgba(255,255,255,.6);
          font-size: 10px;
        }

        /* =========================
           MODAIS
        ========================= */

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(2, 13, 34, .78);
          backdrop-filter: blur(7px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .eventModal,
        .loginModal,
        .formModal {
          width: min(520px, 100%);
          position: relative;
          background: white;
          color: var(--text);
          border-radius: 22px;
          padding: 38px;
          box-shadow: 0 30px 80px rgba(0,0,0,.4);
        }

        .formModal {
          width: min(650px, 100%);
          max-height: 90vh;
          overflow-y: auto;
        }

        .closeButton {
          position: absolute;
          right: 18px;
          top: 15px;
          width: 35px;
          height: 35px;
          border: 0;
          border-radius: 50%;
          background: #f1f3f6;
          color: #24466d;
          font-size: 23px;
        }

        .modalLabel {
          display: block;
          color: #b17b00;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 3px;
          margin-bottom: 8px;
        }

        .eventModal h2,
        .loginModal h2,
        .formModal h2 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 36px;
          font-weight: 500;
        }

        .modalDivider {
          height: 1px;
          background: #e7ad2f;
          margin: 20px 0;
        }

        .modalInfo {
          display: grid;
          gap: 16px;
        }

        .modalInfo small {
          display: block;
          font-size: 8px;
          color: #a67a18;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 4px;
        }

        .modalInfo strong {
          font-size: 14px;
        }

        .modalDescription {
          color: #526987;
          font-size: 13px;
          line-height: 1.6;
          margin-top: 22px;
        }

        .modalActions {
          display: flex;
          gap: 10px;
          margin-top: 25px;
        }

        .editButton,
        .deleteButton {
          border: 0;
          padding: 11px 18px;
          border-radius: 22px;
          font-weight: 700;
        }

        .editButton {
          background: var(--gold);
          color: #08295f;
        }

        .deleteButton {
          background: #f1e4e4;
          color: #9a2929;
        }

        .loginSymbol {
          color: var(--gold);
          font-size: 30px;
          margin-bottom: 10px;
        }

        .loginModal > p {
          color: #61758e;
          font-size: 13px;
          margin: 10px 0 22px;
        }

        .loginModal input,
        .formModal input,
        .formModal textarea {
          width: 100%;
          border: 1px solid #d8e0e9;
          border-radius: 10px;
          padding: 12px 13px;
          outline: none;
          color: #16385f;
          background: #fafbfd;
          font-size: 13px;
          transition: .2s;
        }

        .loginModal input {
          margin-bottom: 11px;
        }

        .loginModal input:focus,
        .formModal input:focus,
        .formModal textarea:focus {
          border-color: var(--gold);
          background: white;
        }

        .rememberLogin {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 1px 0 14px;
          color: #61758e;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .rememberLogin input {
          width: 15px !important;
          height: 15px;
          margin: 0 !important;
          padding: 0 !important;
          accent-color: var(--gold);
          cursor: pointer;
        }

        .loginButton,
        .saveButton {
          width: 100%;
          border: 0;
          background: var(--gold);
          color: #08295f;
          border-radius: 10px;
          padding: 13px;
          font-weight: 800;
          margin-top: 5px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 25px;
        }

        .formGrid label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          color: #365675;
        }

        .formGrid label.full {
          grid-column: 1 / -1;
        }

        .formGrid textarea {
          resize: vertical;
        }

        .saveButton {
          margin-top: 20px;
        }

        /* =========================
           LOADING
        ========================= */

        .loading-screen {
          min-height: 100vh;
          background: #08295f;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-logo {
          color: var(--gold);
          font-family: "Playfair Display", serif;
          font-style: italic;
          font-size: 60px;
        }

        /* =========================
           RESPONSIVO
        ========================= */

        @media (max-width: 900px) {

          .content {
            width: min(720px, calc(100% - 30px));
          }

          .header {
            flex-direction: column;
          }

          .headerButtons {
            width: 100%;
            justify-content: flex-start;
          }

          .eventsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .decorTopLeft,
          .decorBottomLeft {
            opacity: .55;
          }

        }

        @media (max-width: 650px) {

          .content {
            width: calc(100% - 22px);
            padding-top: 25px;
          }

          .brand {
            gap: 12px;
          }

          .logoArea {
            width: 80px;
            min-width: 80px;
          }

          .logo {
            max-width: 80px;
            max-height: 80px;
          }

          .brandDivider {
            height: 75px;
          }

          .smallTitle {
            font-size: 9px;
            letter-spacing: 4px;
          }

          .titleArea h1 {
            font-size: 55px;
          }

          .subtitle {
            font-size: 7px;
            letter-spacing: 2px;
          }

          .titleDecoration span {
            width: 70px;
          }

          .headerButtons {
            gap: 7px;
          }

          .outlineButton {
            font-size: 10px;
            padding: 9px 12px;
          }

          .featuredEvent {
            grid-template-columns: 105px 1fr;
            min-height: 180px;
          }

          .featuredDate {
            padding: 40px 13px 15px;
          }

          .featuredDate strong {
            font-size: 48px;
          }

          .featuredMonth {
            font-size: 15px;
          }

          .featuredInfo {
            font-size: 8px;
          }

          .featuredContent {
            padding: 24px 18px;
          }

          .featuredContent h2 {
            font-size: 21px;
          }

          .featuredContent p {
            font-size: 11px;
          }

          .monthTitle h2 {
            font-size: 45px;
          }

          .monthArrow {
            width: 37px;
            height: 37px;
          }

          .eventsGrid {
            grid-template-columns: 1fr;
          }

          .decorTopLeft {
            left: -80px;
          }

          .decorTopRight {
            right: -90px;
          }

          .decorBottomLeft {
            left: -100px;
          }

          .decorBottomRight {
            right: -100px;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .formGrid label.full {
            grid-column: auto;
          }

          .eventModal,
          .loginModal,
          .formModal {
            padding: 28px 22px;
          }

        }

      `}</style>

    </main>
  );
}