"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import type { User } from "@supabase/supabase-js";

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

const diasSemana = [
  "DOM",
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB",
];

function dataLocalISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export default function Home() {
  const agora = new Date();

  const [mesAtual, setMesAtual] = useState(agora.getMonth());
  const [anoAtual, setAnoAtual] = useState(agora.getFullYear());

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [todosEventosFuturos, setTodosEventosFuturos] = useState<Evento[]>(
    []
  );

  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);
  const [carregandoEventos, setCarregandoEventos] = useState(true);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [eventoSelecionado, setEventoSelecionado] =
    useState<Evento | null>(null);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [manterConectado, setManterConectado] = useState(true);
  const [entrando, setEntrando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");

  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [salvandoEvento, setSalvandoEvento] = useState(false);

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

    setEntrando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert("E-mail ou senha incorretos.");
      console.error(error);
      setEntrando(false);
      return;
    }

    localStorage.setItem(
      "ejc_manter_conectado",
      manterConectado ? "true" : "false"
    );

    setMostrarLogin(false);
    setEmail("");
    setSenha("");
    setEntrando(false);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  /* =========================
     EVENTOS
  ========================= */

  useEffect(() => {
    carregarEventos();
    carregarProximosEventos();
  }, [mesAtual, anoAtual]);

  async function carregarEventos() {
    setCarregandoEventos(true);

    const primeiroDia = dataLocalISO(new Date(anoAtual, mesAtual, 1));
    const ultimoDia = dataLocalISO(new Date(anoAtual, mesAtual + 1, 0));

    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .gte("data", primeiroDia)
      .lte("data", ultimoDia)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      console.error(error);
      setCarregandoEventos(false);
      return;
    }

    setEventos(data || []);
    setCarregandoEventos(false);
  }

  async function carregarProximosEventos() {
    const hoje = dataLocalISO(new Date());

    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .gte("data", hoje)
      .order("data", { ascending: true })
      .order("horario", { ascending: true })
      .limit(20);

    if (error) {
      console.error(error);
      return;
    }

    setTodosEventosFuturos(data || []);
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

    setEventoSelecionado(null);
    setMostrarFormulario(true);
  }

  async function salvarEvento() {
    if (!titulo.trim() || !data || !horario || !local.trim()) {
      alert("Preencha título, data, horário e local.");
      return;
    }

    setSalvandoEvento(true);

    if (eventoEditando) {
      const { error } = await supabase
        .from("eventos")
        .update({
          titulo: titulo.trim(),
          data,
          horario,
          local: local.trim(),
          descricao: descricao.trim(),
        })
        .eq("id", eventoEditando.id);

      if (error) {
        console.error(error);
        alert("Não foi possível editar o evento.");
        setSalvandoEvento(false);
        return;
      }
    } else {
      const { error } = await supabase.from("eventos").insert({
        titulo: titulo.trim(),
        data,
        horario,
        local: local.trim(),
        descricao: descricao.trim(),
      });

      if (error) {
        console.error(error);
        alert("Não foi possível criar o evento.");
        setSalvandoEvento(false);
        return;
      }
    }

    setMostrarFormulario(false);
    setEventoEditando(null);
    setSalvandoEvento(false);

    await carregarEventos();
    await carregarProximosEventos();
  }

  async function excluirEvento(id: number) {
    const confirmar = confirm(
      "Deseja realmente excluir este evento?\n\nEssa ação não poderá ser desfeita."
    );

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

    await carregarEventos();
    await carregarProximosEventos();
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

  function irParaHoje() {
    const hoje = new Date();

    setMesAtual(hoje.getMonth());
    setAnoAtual(hoje.getFullYear());
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
      diaSemana: diasSemana[
        new Date(ano, mes - 1, dia).getDay()
      ],
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

    return Math.ceil(
      diferenca / (1000 * 60 * 60 * 24)
    );
  }

  const hojeISO = dataLocalISO(new Date());

  const eventosDoMes = useMemo(() => {
    return [...eventos].sort((a, b) => {
      if (a.data !== b.data) {
        return a.data.localeCompare(b.data);
      }

      return a.horario.localeCompare(b.horario);
    });
  }, [eventos]);

  const eventosPorData = useMemo(() => {
    const grupos: Record<string, Evento[]> = {};

    eventosDoMes.forEach((evento) => {
      if (!grupos[evento.data]) {
        grupos[evento.data] = [];
      }

      grupos[evento.data].push(evento);
    });

    return Object.entries(grupos);
  }, [eventosDoMes]);

  const proximoEvento =
    todosEventosFuturos.length > 0
      ? todosEventosFuturos[0]
      : null;

  const quantidadeEventos = eventosDoMes.length;

  const eventosHoje = eventosDoMes.filter(
    (evento) => evento.data === hojeISO
  );

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

  /* =========================
     LOADING
  ========================= */

  if (carregandoUsuario) {
    return (
      <main className="loading-screen">
        <div className="loadingContent">
          <div className="loadingSymbol">✦</div>
          <div className="loadingLogo">EJC</div>
          <span>Calendário</span>
        </div>
      </main>
    );
  }

  return (
    <main className="page">

      {/* =========================
          FUNDO / DECORAÇÕES
      ========================= */}

      <div className="backgroundGlow glowOne" />
      <div className="backgroundGlow glowTwo" />

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

      <span className="goldStar star1">✦</span>
      <span className="goldStar star2">✦</span>
      <span className="goldStar star3">✦</span>
      <span className="goldStar star4">✦</span>

      {/* =========================
          CONTEÚDO
      ========================= */}

      <div className="content">

        {/* =========================
            HEADER
        ========================= */}

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

          <div className="headerActions">

            <button
              className="outlineButton"
              onClick={compartilharWhatsApp}
              aria-label="Compartilhar pelo WhatsApp"
            >
              <svg className="buttonIcon whatsappIcon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.5 3.5A11.8 11.8 0 0 0 12.08 0C5.53 0 .2 5.32.2 11.87c0 2.09.55 4.13 1.6 5.94L.1 24l6.34-1.66a11.9 11.9 0 0 0 5.63 1.43h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.14-3.46-8.39ZM12.08 21.72h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.76.98 1-3.67-.23-.38a9.87 9.87 0 1 1 8.38 4.65Zm5.41-7.4c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.03-1.05 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.13 4.54.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z"/>
              </svg>
              Compartilhar
            </button>

            {usuario ? (
              <>
                <div className="cgStatus">
                  <span className="statusDot" />
                  <div>
                    <strong>CG</strong>
                    <small>Acesso autorizado</small>
                  </div>
                </div>

                <button
                  className="goldOutlineButton"
                  onClick={abrirNovoEvento}
                >
                  <span>＋</span>
                  Novo evento
                </button>

                <button
                  className="logoutButton"
                  onClick={sair}
                  title="Sair da área dos CGs"
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                className="goldOutlineButton"
                onClick={() => setMostrarLogin(true)}
                aria-label="Acessar área dos CGs"
              >
                <svg className="buttonIcon lockIcon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Acesso dos CGs
              </button>
            )}

          </div>

        </header>

        {/* =========================
            BARRA DE STATUS
        ========================= */}

        <div className="topInfoBar">

          <div className="infoItem">
            <span className="infoIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                <path d="M8 13h3M13 13h3M8 16.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <div>
              <small>CALENDÁRIO</small>
              <strong>{meses[mesAtual]} de {anoAtual}</strong>
            </div>
          </div>

          <div className="infoDivider" />

          <div className="infoItem">
            <span className="infoIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3.5l1.8 5.7L19.5 11l-5.7 1.8L12 18.5l-1.8-5.7L4.5 11l5.7-1.8L12 3.5Z" fill="currentColor"/>
                <path d="M18.5 16l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" fill="currentColor" opacity=".72"/>
              </svg>
            </span>
            <div>
              <small>EVENTOS NO MÊS</small>
              <strong>
                {quantidadeEventos === 1
                  ? "1 evento"
                  : `${quantidadeEventos} eventos`}
              </strong>
            </div>
          </div>

          <div className="infoDivider" />

          <div className="infoItem">
            <span className="infoIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 20.2S4.5 15.8 4.5 9.7A4.2 4.2 0 0 1 8.7 5.5c1.4 0 2.6.7 3.3 1.8.7-1.1 1.9-1.8 3.3-1.8a4.2 4.2 0 0 1 4.2 4.2c0 6.1-7.5 10.5-7.5 10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <small>PRÓXIMO</small>
              <strong>
                {proximoEvento
                  ? formatarData(proximoEvento.data).dataCompleta
                  : "Nenhum evento"}
              </strong>
            </div>
          </div>

        </div>

        {/* =========================
            PRÓXIMO EVENTO
        ========================= */}

        {proximoEvento && (
          <section
            className={`featuredEvent ${
              proximoEvento.data === hojeISO
                ? "featuredToday"
                : ""
            }`}
            onClick={() =>
              setEventoSelecionado(proximoEvento)
            }
          >

            <div className="featuredDate">

              <div className="nextBadge">
                {proximoEvento.data === hojeISO
                  ? "É HOJE"
                  : "PRÓXIMO EVENTO"}
              </div>

              <span className="featuredWeek">
                {formatarData(proximoEvento.data).diaSemana}
              </span>

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

              <span className="sectionEyebrow">
                MOMENTO EJC
              </span>

              <h2>
                {proximoEvento.titulo}
              </h2>

              <p>
                {proximoEvento.descricao ||
                  "Um encontro especial de oração, comunhão e muita alegria."}
              </p>

              <div className="featuredBottom">

                <div className="daysBadge">
                  ◷{" "}
                  {calcularDias(proximoEvento.data) > 0
                    ? `Faltam ${calcularDias(
                        proximoEvento.data
                      )} dias`
                    : calcularDias(
                        proximoEvento.data
                      ) === 0
                    ? "É hoje!"
                    : "Evento realizado"}
                </div>

                <span className="viewDetails">
                  Ver detalhes →
                </span>

              </div>

            </div>

          </section>
        )}

        {/* =========================
            NAVEGAÇÃO DO MÊS
        ========================= */}

        <section className="monthSection">

          <div className="monthHeader">

            <div>
              <span className="sectionEyebrow">
                AGENDA EJC
              </span>

              <div className="monthTitle">
                <h2>{meses[mesAtual]}</h2>
                <span>{anoAtual}</span>
              </div>
            </div>

            <div className="monthControls">

              <button
                className="todayButton"
                onClick={irParaHoje}
              >
                Hoje
              </button>

              <div className="monthArrows">
                <button
                  className="monthArrow"
                  onClick={mesAnterior}
                  aria-label="Mês anterior"
                >
                  ‹
                </button>

                <button
                  className="monthArrow"
                  onClick={proximoMes}
                  aria-label="Próximo mês"
                >
                  ›
                </button>
              </div>

            </div>

          </div>

          <div className="monthDecoration">
            <span />
            <b>♡</b>
            <span />
          </div>

        </section>

        {/* =========================
            EVENTOS
        ========================= */}

        {carregandoEventos ? (

          <div className="eventsLoading">
            <div className="loadingSpinner" />
            <span>Carregando agenda...</span>
          </div>

        ) : eventosDoMes.length === 0 ? (

          <div className="emptyState">

            <div className="emptySymbol">
              ✦
            </div>

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
                ＋ Adicionar evento
              </button>
            )}

          </div>

        ) : (

          <section className="agenda">

            {eventosPorData.map(
              ([dataEvento, eventosDoDia]) => {

                const info = formatarData(dataEvento);
                const ehHoje = dataEvento === hojeISO;

                return (
                  <div
                    className={`dayGroup ${
                      ehHoje ? "todayGroup" : ""
                    }`}
                    key={dataEvento}
                  >

                    <div className="dayHeader">

                      <div className="dayDate">

                        <span>
                          {info.diaSemana}
                        </span>

                        <strong>
                          {info.dia}
                        </strong>

                        <small>
                          {info.mes}
                        </small>

                      </div>

                      <div className="dayLine">
                        <span>
                          {ehHoje
                            ? "Hoje"
                            : info.dataCompleta}
                        </span>
                      </div>

                      <div className="dayCount">
                        {eventosDoDia.length}
                        <small>
                          {eventosDoDia.length === 1
                            ? "evento"
                            : "eventos"}
                        </small>
                      </div>

                    </div>

                    <div className="dayEvents">

                      {eventosDoDia.map((evento) => (

                        <article
                          key={evento.id}
                          className={`eventCard ${
                            evento.data === hojeISO
                              ? "todayCard"
                              : ""
                          }`}
                          onClick={() =>
                            setEventoSelecionado(evento)
                          }
                        >

                          <div className="eventCardTime">
                            <span>HORÁRIO</span>
                            <strong>
                              {evento.horario.slice(0, 5)}
                            </strong>
                          </div>

                          <div className="eventCardMain">

                            <span className="eventTag">
                              EJC
                            </span>

                            <h3>
                              {evento.titulo}
                            </h3>

                            {evento.descricao && (
                              <p>
                                {evento.descricao}
                              </p>
                            )}

                            <div className="eventLocation">
                              <span>♢</span>
                              {evento.local}
                            </div>

                          </div>

                          <div className="eventCardArrow">
                            →
                          </div>

                        </article>

                      ))}

                    </div>

                  </div>
                );
              }
            )}

          </section>

        )}

        {/* =========================
            ÁREA CG
        ========================= */}

        {usuario && (
          <section className="cgPanel">

            <div className="cgPanelIcon">
              ✦
            </div>

            <div className="cgPanelText">
              <span>ÁREA DOS CGs</span>
              <strong>Gerenciamento da agenda</strong>
              <p>
                Você está conectado. Toque em um evento para
                editar ou excluir.
              </p>
            </div>

            <button
              className="cgPanelButton"
              onClick={abrirNovoEvento}
            >
              ＋ Novo evento
            </button>

          </section>
        )}



      </div>

      {/* =========================
          MODAL EVENTO
      ========================= */}

      {eventoSelecionado && (

        <div
          className="modalOverlay"
          onClick={() =>
            setEventoSelecionado(null)
          }
        >

          <div
            className="eventModal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="closeButton"
              onClick={() =>
                setEventoSelecionado(null)
              }
            >
              ×
            </button>

            <div className="modalEventDate">

              <span>
                {formatarData(
                  eventoSelecionado.data
                ).diaSemana}
              </span>

              <strong>
                {formatarData(
                  eventoSelecionado.data
                ).dia}
              </strong>

              <small>
                {formatarData(
                  eventoSelecionado.data
                ).mes}
              </small>

            </div>

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
                  {
                    formatarData(
                      eventoSelecionado.data
                    ).dataCompleta
                  }
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
              <div className="modalDescriptionBox">
                <small>DESCRIÇÃO</small>

                <p>
                  {eventoSelecionado.descricao}
                </p>
              </div>
            )}

            {usuario && (
              <div className="modalActions">

                <button
                  className="editButton"
                  onClick={() =>
                    abrirEditarEvento(
                      eventoSelecionado
                    )
                  }
                >
                  ✎ Editar evento
                </button>

                <button
                  className="deleteButton"
                  onClick={() =>
                    excluirEvento(
                      eventoSelecionado.id
                    )
                  }
                >
                  Excluir
                </button>

              </div>
            )}

            {!usuario && (
              <button
                className="modalShareButton"
                onClick={compartilharWhatsApp}
              >
                <svg className="buttonIcon whatsappIcon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.5 3.5A11.8 11.8 0 0 0 12.08 0C5.53 0 .2 5.32.2 11.87c0 2.09.55 4.13 1.6 5.94L.1 24l6.34-1.66a11.9 11.9 0 0 0 5.63 1.43h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.14-3.46-8.39ZM12.08 21.72h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.76.98 1-3.67-.23-.38a9.87 9.87 0 1 1 8.38 4.65Zm5.41-7.4c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.03-1.05 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.13 4.54.72.31 1.28.49 1.72.63.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z"/>
                </svg>
                Compartilhar calendário
              </button>
            )}

          </div>

        </div>

      )}

      {/* =========================
          LOGIN DOS CGs
      ========================= */}

      {mostrarLogin && (

        <div
          className="modalOverlay loginOverlay"
          onClick={() =>
            setMostrarLogin(false)
          }
        >

          <div
            className="loginModal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="closeButton"
              onClick={() =>
                setMostrarLogin(false)
              }
            >
              ×
            </button>

            <div className="loginHeader">

              <div className="loginLogoCircle">
                <img
                  src="/logo-ejc.png"
                  alt="EJC"
                />
              </div>

              <div>
                <span>
                  ÁREA RESTRITA
                </span>

                <strong>
                  Acesso dos CGs
                </strong>
              </div>

            </div>

            <div className="loginWelcome">

              <h2>
                Bem-vindo.
              </h2>

              <p>
                Entre para administrar os eventos
                do calendário do EJC.
              </p>

            </div>

            <div className="loginFields">

              <label>
                E-mail

                <div className="inputWrapper">
                  <span>✉</span>

                  <input
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                  />
                </div>

              </label>

              <label>
                Senha

                <div className="inputWrapper">
                  <span>◆</span>

                  <input
                    type="password"
                    placeholder="Digite sua senha"
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
                </div>

              </label>

            </div>

            <label className="rememberLogin">

              <input
                type="checkbox"
                checked={manterConectado}
                onChange={(e) =>
                  setManterConectado(
                    e.target.checked
                  )
                }
              />

              <span>
                Manter conectado neste dispositivo
              </span>

            </label>

            <button
              className="loginButton"
              onClick={entrar}
              disabled={entrando}
            >
              {entrando
                ? "Entrando..."
                : "Entrar na área dos CGs"}
            </button>

            <div className="loginSecurity">
              <span>●</span>
              Acesso protegido para os CGs
            </div>

          </div>

        </div>

      )}

      {/* =========================
          FORMULÁRIO
      ========================= */}

      {mostrarFormulario && (

        <div
          className="modalOverlay"
          onClick={() =>
            setMostrarFormulario(false)
          }
        >

          <div
            className="formModal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="closeButton"
              onClick={() =>
                setMostrarFormulario(false)
              }
            >
              ×
            </button>

            <div className="formHeader">

              <span className="modalLabel">
                ÁREA DOS CGs
              </span>

              <h2>
                {eventoEditando
                  ? "Editar evento"
                  : "Novo evento"}
              </h2>

              <p>
                {eventoEditando
                  ? "Atualize as informações do evento."
                  : "Adicione um novo compromisso à agenda do EJC."}
              </p>

            </div>

            <div className="formGrid">

              <label className="full">
                Título do evento

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

              <label className="full">
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

            <div className="formFooter">

              <button
                className="cancelButton"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                Cancelar
              </button>

              <button
                className="saveButton"
                onClick={salvarEvento}
                disabled={salvandoEvento}
              >
                {salvandoEvento
                  ? "Salvando..."
                  : eventoEditando
                  ? "Salvar alterações"
                  : "Adicionar evento"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================
          CSS
      ========================= */}

      <style jsx global>{`

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap');

        :root {
          --blue: #08295f;
          --blue-dark: #051d45;
          --blue-deep: #041832;
          --blue-light: #0d3979;
          --gold: #e7ad2f;
          --gold-light: #f5ca50;
          --gold-soft: #f8e4a3;
          --white: #ffffff;
          --text: #0b2c5d;
          --muted: #637894;
          --border: #e4eaf1;
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
          background: var(--blue-deep);
          color: white;
        }

        body,
        button,
        input,
        textarea {
          font-family: "DM Sans", sans-serif;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: .7;
        }

        /* =========================
           PAGE
        ========================= */

        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(31, 91, 170, .32),
              transparent 34%
            ),
            radial-gradient(
              circle at 90% 70%,
              rgba(13, 62, 131, .25),
              transparent 32%
            ),
            linear-gradient(
              135deg,
              #061d45 0%,
              #08295f 48%,
              #061f4c 100%
            );
        }

        .backgroundGlow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(70px);
          opacity: .18;
        }

        .glowOne {
          width: 320px;
          height: 320px;
          background: #2764b7;
          top: 100px;
          left: -120px;
        }

        .glowTwo {
          width: 280px;
          height: 280px;
          background: #e7ad2f;
          bottom: 200px;
          right: -180px;
          opacity: .06;
        }

        /* =========================
           DECORAÇÕES
        ========================= */

        .decor {
          position: absolute;
          color: rgba(231, 173, 47, .42);
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
          font-size: 13px;
          z-index: 2;
          opacity: .65;
          pointer-events: none;
        }

        .star1 {
          left: 18%;
          top: 22%;
        }

        .star2 {
          right: 18%;
          top: 30%;
        }

        .star3 {
          left: 10%;
          top: 64%;
          font-size: 10px;
        }

        .star4 {
          right: 11%;
          top: 68%;
          font-size: 11px;
        }

        /* =========================
           CONTENT
        ========================= */

        .content {
          position: relative;
          z-index: 5;
          width: min(1120px, calc(100% - 50px));
          margin: 0 auto;
          padding: 38px 0 65px;
        }

        /* =========================
           HEADER
        ========================= */

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .logoArea {
          width: 175px;
          min-width: 175px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo {
          width: 175px;
          height: auto;
          transform: translateY(-12px);
        }

        .brandDivider {
          width: 1px;
          height: 100px;
          background: rgba(231, 173, 47, .7);
        }

        .titleArea {
          padding-top: 2px;
        }

        .smallTitle {
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 6px;
          color: white;
        }

        .titleArea h1 {
          margin: 1px 0 0;
          color: var(--gold-light);
          font-family: "Playfair Display", serif;
          font-size: clamp(58px, 7vw, 84px);
          line-height: .95;
          font-style: italic;
          font-weight: 500;
        }

        .subtitle {
          display: block;
          margin-top: 10px;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 3px;
          color: rgba(255,255,255,.9);
        }

        .titleDecoration {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 17px;
        }

        .titleDecoration span {
          width: 100px;
          height: 1px;
          background: rgba(231, 173, 47, .7);
        }

        .titleDecoration b {
          color: var(--gold);
          font-size: 16px;
          font-weight: 400;
        }

        .headerActions {
          display: flex;
          gap: 8px;
          padding-top: 5px;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
        }

        .buttonIcon {
          width: 15px;
          height: 15px;
          flex: 0 0 15px;
          display: block;
        }

        .whatsappIcon {
          fill: currentColor;
        }

        .lockIcon {
          color: currentColor;
        }

        .outlineButton,
        .goldOutlineButton,
        .logoutButton {
          border-radius: 30px;
          padding: 10px 15px;
          font-size: 11px;
          font-weight: 800;
          transition: .2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .outlineButton {
          border: 1px solid rgba(231,173,47,.7);
          background: rgba(4,24,50,.25);
          color: white;
        }

        .outlineButton:hover,
        .goldOutlineButton:hover {
          transform: translateY(-2px);
          background: var(--gold);
          color: var(--blue-deep);
        }

        .goldOutlineButton {
          border: 1px solid var(--gold);
          background: var(--gold);
          color: var(--blue-deep);
        }

        .goldOutlineButton:hover {
          background: var(--gold-light);
        }

        .logoutButton {
          border: 1px solid rgba(255,255,255,.22);
          background: rgba(255,255,255,.07);
          color: white;
        }

        .logoutButton:hover {
          background: rgba(255,255,255,.14);
        }

        .cgStatus {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 10px 5px 7px;
          border: 1px solid rgba(231,173,47,.32);
          border-radius: 30px;
          background: rgba(255,255,255,.045);
        }

        .statusDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #63d69a;
          box-shadow: 0 0 0 4px rgba(99,214,154,.1);
        }

        .cgStatus div {
          display: flex;
          flex-direction: column;
        }

        .cgStatus strong {
          color: var(--gold-light);
          font-size: 9px;
          letter-spacing: 1px;
        }

        .cgStatus small {
          color: rgba(255,255,255,.62);
          font-size: 7px;
        }

        /* =========================
           INFO BAR
        ========================= */

        .topInfoBar {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr;
          align-items: center;
          gap: 18px;
          padding: 15px 20px;
          margin-bottom: 25px;
          border: 1px solid rgba(231,173,47,.18);
          border-radius: 16px;
          background: rgba(255,255,255,.045);
          backdrop-filter: blur(12px);
        }

        .infoItem {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .infoIcon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          border: 1px solid rgba(231,173,47,.34);
          background: linear-gradient(145deg, rgba(231,173,47,.13), rgba(255,255,255,.035));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
        }

        .infoIcon svg {
          width: 18px;
          height: 18px;
          display: block;
        }

        .infoItem div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .infoItem small {
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: rgba(255,255,255,.5);
        }

        .infoItem strong {
          font-size: 11px;
          color: white;
        }

        .infoDivider {
          width: 1px;
          height: 30px;
          background: rgba(255,255,255,.1);
        }

        /* =========================
           FEATURED
        ========================= */

        .featuredEvent {
          display: grid;
          grid-template-columns: 190px 1fr;
          min-height: 205px;
          background: white;
          border: 1px solid var(--gold);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 18px 45px rgba(0,0,0,.18);
          transition: .25s ease;
        }

        .featuredEvent:hover {
          transform: translateY(-3px);
          box-shadow: 0 24px 50px rgba(0,0,0,.23);
        }

        .featuredToday {
          border-color: var(--gold-light);
        }

        .featuredDate {
          position: relative;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(42,101,183,.55),
              transparent 55%
            ),
            linear-gradient(
              160deg,
              #0d3979,
              #07265a
            );
          padding: 48px 23px 20px;
          display: flex;
          flex-direction: column;
        }

        .nextBadge {
          position: absolute;
          left: 16px;
          top: 0;
          background: var(--gold-light);
          color: #08295f;
          padding: 8px 13px;
          border-radius: 0 0 10px 10px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .5px;
        }

        .featuredWeek {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
          color: rgba(255,255,255,.65);
          margin-bottom: 4px;
        }

        .featuredDate strong {
          font-size: 62px;
          line-height: .85;
          color: white;
          font-weight: 800;
        }

        .featuredMonth {
          color: var(--gold-light);
          font-size: 18px;
          font-weight: 800;
          margin-top: 7px;
        }

        .featuredInfo {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: auto;
          color: white;
          font-size: 9px;
          font-weight: 600;
        }

        .featuredContent {
          padding: 32px 38px;
          color: var(--text);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .sectionEyebrow {
          display: block;
          color: #aa7909;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .featuredContent h2 {
          margin: 7px 0 9px;
          font-family: "Playfair Display", serif;
          font-size: 29px;
          font-weight: 600;
          line-height: 1.15;
        }

        .featuredContent p {
          max-width: 650px;
          margin: 0 0 18px;
          font-size: 13px;
          line-height: 1.6;
          color: #526987;
        }

        .featuredBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .daysBadge {
          width: fit-content;
          border: 1px solid var(--gold);
          border-radius: 25px;
          color: #936600;
          padding: 7px 13px;
          font-size: 10px;
          font-weight: 800;
        }

        .viewDetails {
          color: #345475;
          font-size: 10px;
          font-weight: 800;
        }

        /* =========================
           MONTH
        ========================= */

        .monthSection {
          padding: 42px 0 27px;
        }

        .monthHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
        }

        .monthTitle {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .monthTitle h2 {
          margin: 3px 0 0;
          font-family: "Playfair Display", serif;
          font-size: 57px;
          font-style: italic;
          font-weight: 500;
          color: var(--gold-light);
          line-height: 1;
        }

        .monthTitle span {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 3px;
          color: rgba(255,255,255,.65);
        }

        .monthControls {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .todayButton {
          border: 1px solid rgba(231,173,47,.55);
          background: rgba(255,255,255,.04);
          color: white;
          border-radius: 25px;
          padding: 9px 15px;
          font-size: 10px;
          font-weight: 800;
        }

        .todayButton:hover {
          background: rgba(231,173,47,.12);
        }

        .monthArrows {
          display: flex;
          gap: 6px;
        }

        .monthArrow {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid var(--gold);
          background: transparent;
          color: var(--gold-light);
          font-size: 28px;
          line-height: 1;
          transition: .2s ease;
        }

        .monthArrow:hover {
          background: var(--gold);
          color: var(--blue-deep);
        }

        .monthSummary {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 10px;
          color: rgba(255,255,255,.68);
          font-size: 11px;
        }

        .todaySummary {
          color: var(--gold-light);
          font-weight: 800;
        }

        .monthDecoration {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 22px;
        }

        .monthDecoration span {
          flex: 1;
          height: 1px;
          background: rgba(231,173,47,.35);
        }

        .monthDecoration b {
          color: var(--gold);
          font-size: 16px;
          font-weight: 400;
        }

        /* =========================
           AGENDA
        ========================= */

        .agenda {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .dayGroup {
          position: relative;
        }

        .dayHeader {
          display: grid;
          grid-template-columns: 74px 1fr auto;
          align-items: center;
          gap: 15px;
          margin-bottom: 12px;
        }

        .dayDate {
          display: grid;
          grid-template-columns: auto auto;
          grid-template-rows: auto auto;
          column-gap: 7px;
          align-items: center;
          width: fit-content;
        }

        .dayDate span {
          grid-column: 1 / -1;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.5px;
          color: var(--gold-light);
        }

        .dayDate strong {
          font-size: 31px;
          line-height: 1;
          color: white;
        }

        .dayDate small {
          align-self: end;
          font-size: 8px;
          color: rgba(255,255,255,.6);
          font-weight: 800;
          margin-bottom: 2px;
        }

        .dayLine {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dayLine::before {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(255,255,255,.11);
        }

        .dayLine span {
          color: rgba(255,255,255,.48);
          font-size: 9px;
          white-space: nowrap;
        }

        .dayCount {
          min-width: 45px;
          text-align: right;
          color: var(--gold-light);
          font-size: 14px;
          font-weight: 900;
        }

        .dayCount small {
          display: block;
          color: rgba(255,255,255,.45);
          font-size: 7px;
          font-weight: 600;
        }

        .todayGroup .dayDate strong {
          color: var(--gold-light);
        }

        .todayGroup .dayLine span {
          color: var(--gold-light);
          font-weight: 800;
        }

        .dayEvents {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-left: 74px;
        }

        .eventCard {
          display: grid;
          grid-template-columns: 86px 1fr 32px;
          align-items: center;
          gap: 18px;
          background: white;
          color: var(--text);
          border-radius: 15px;
          border: 1px solid rgba(231,173,47,.35);
          padding: 13px 16px;
          min-height: 105px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0,0,0,.1);
          transition: .2s ease;
        }

        .eventCard:hover {
          transform: translateX(4px);
          border-color: var(--gold);
          box-shadow: 0 13px 28px rgba(0,0,0,.15);
        }

        .todayCard {
          border-color: rgba(231,173,47,.85);
          box-shadow: 0 8px 28px rgba(231,173,47,.1);
        }

        .eventCardTime {
          background: var(--gold-light);
          color: var(--blue-deep);
          border-radius: 11px;
          padding: 10px;
          text-align: center;
        }

        .eventCardTime span {
          display: block;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .eventCardTime strong {
          display: block;
          margin-top: 3px;
          font-size: 17px;
        }

        .eventCardMain {
          min-width: 0;
        }

        .eventTag {
          display: inline-block;
          padding: 3px 7px;
          border-radius: 5px;
          background: #edf3fa;
          color: #4e6885;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .eventCard h3 {
          margin: 4px 0 4px;
          font-size: 16px;
          font-weight: 800;
        }

        .eventCard p {
          margin: 0 0 6px;
          font-size: 10px;
          line-height: 1.45;
          color: #61758e;
        }

        .eventLocation {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #536c88;
          font-size: 9px;
          font-weight: 700;
        }

        .eventLocation span {
          color: #a8790d;
        }

        .eventCardArrow {
          color: var(--gold);
          font-size: 20px;
          text-align: right;
        }

        /* =========================
           CG PANEL
        ========================= */

        .cgPanel {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 35px;
          padding: 16px 18px;
          border: 1px solid rgba(231,173,47,.28);
          border-radius: 16px;
          background:
            linear-gradient(
              90deg,
              rgba(231,173,47,.08),
              rgba(255,255,255,.035)
            );
        }

        .cgPanelIcon {
          width: 43px;
          height: 43px;
          min-width: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(231,173,47,.12);
          color: var(--gold-light);
          font-size: 18px;
        }

        .cgPanelText {
          flex: 1;
        }

        .cgPanelText span {
          display: block;
          color: var(--gold-light);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .cgPanelText strong {
          display: block;
          margin-top: 2px;
          font-size: 13px;
        }

        .cgPanelText p {
          margin: 3px 0 0;
          color: rgba(255,255,255,.53);
          font-size: 9px;
        }

        .cgPanelButton {
          border: 1px solid var(--gold);
          border-radius: 25px;
          background: var(--gold);
          color: var(--blue-deep);
          padding: 10px 15px;
          font-size: 10px;
          font-weight: 900;
        }

        /* =========================
           EMPTY
        ========================= */

        .emptyState {
          text-align: center;
          padding: 55px 20px;
          border: 1px solid rgba(231,173,47,.25);
          border-radius: 18px;
          background: rgba(255,255,255,.035);
        }

        .emptySymbol {
          color: var(--gold);
          font-size: 28px;
        }

        .emptyState h3 {
          margin: 12px 0 5px;
          font-size: 19px;
        }

        .emptyState p {
          margin: 0 0 20px;
          color: rgba(255,255,255,.58);
          font-size: 12px;
        }

        .goldButton {
          border: 0;
          background: var(--gold);
          color: var(--blue-deep);
          padding: 11px 19px;
          border-radius: 25px;
          font-size: 11px;
          font-weight: 900;
        }

        /* =========================
           LOADING
        ========================= */

        .eventsLoading {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255,255,255,.55);
          font-size: 11px;
        }

        .loadingSpinner {
          width: 27px;
          height: 27px;
          border-radius: 50%;
          border: 2px solid rgba(231,173,47,.2);
          border-top-color: var(--gold);
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =========================
           MODAIS
        ========================= */

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(2, 13, 34, .78);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn .18s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        .eventModal,
        .loginModal,
        .formModal {
          width: min(520px, 100%);
          position: relative;
          background: white;
          color: var(--text);
          border-radius: 21px;
          padding: 35px;
          box-shadow: 0 30px 90px rgba(0,0,0,.42);
          animation: modalUp .2s ease;
        }

        @keyframes modalUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .formModal {
          width: min(650px, 100%);
          max-height: 90vh;
          overflow-y: auto;
        }

        .closeButton {
          position: absolute;
          right: 15px;
          top: 15px;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: #f1f3f6;
          color: #24466d;
          font-size: 22px;
          line-height: 1;
        }

        .closeButton:hover {
          background: #e5e9ee;
        }

        /* =========================
           EVENT MODAL
        ========================= */

        .modalEventDate {
          display: inline-grid;
          grid-template-columns: auto auto;
          grid-template-rows: auto auto;
          column-gap: 7px;
          margin-bottom: 18px;
          padding: 9px 13px;
          border-radius: 12px;
          background: #f5f8fb;
        }

        .modalEventDate span {
          grid-column: 1 / -1;
          color: #a8790d;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .modalEventDate strong {
          color: var(--text);
          font-size: 25px;
          line-height: 1;
        }

        .modalEventDate small {
          align-self: end;
          color: #60758f;
          font-size: 8px;
          font-weight: 800;
        }

        .modalLabel {
          display: block;
          color: #b17b00;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 3px;
          margin-bottom: 7px;
        }

        .eventModal h2,
        .loginModal h2,
        .formModal h2 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 33px;
          font-weight: 600;
          line-height: 1.15;
        }

        .modalDivider {
          height: 1px;
          background: #e7ad2f;
          margin: 19px 0;
        }

        .modalInfo {
          display: grid;
          gap: 14px;
        }

        .modalInfo small,
        .modalDescriptionBox small {
          display: block;
          font-size: 7px;
          color: #a67a18;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 4px;
        }

        .modalInfo strong {
          font-size: 13px;
        }

        .modalDescriptionBox {
          margin-top: 20px;
          padding: 13px;
          border-radius: 11px;
          background: #f7f9fb;
        }

        .modalDescriptionBox p {
          margin: 5px 0 0;
          color: #526987;
          font-size: 12px;
          line-height: 1.6;
        }

        .modalActions {
          display: flex;
          gap: 9px;
          margin-top: 22px;
        }

        .editButton,
        .deleteButton,
        .modalShareButton {
          border: 0;
          padding: 11px 16px;
          border-radius: 22px;
          font-size: 10px;
          font-weight: 900;
        }

        .editButton {
          background: var(--gold);
          color: var(--blue-deep);
        }

        .deleteButton {
          background: #f5e9e9;
          color: #982e2e;
        }

        .modalShareButton {
          width: 100%;
          margin-top: 20px;
          background: var(--blue);
          color: white;
        }

        /* =========================
           LOGIN
        ========================= */

        .loginModal {
          width: min(450px, 100%);
        }

        .loginHeader {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 25px;
        }

        .loginLogoCircle {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: var(--blue);
          overflow: hidden;
        }

        .loginLogoCircle img {
          width: 40px;
          height: 40px;
          object-fit: contain;
        }

        .loginHeader div:last-child {
          display: flex;
          flex-direction: column;
        }

        .loginHeader span {
          color: #a8790d;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .loginHeader strong {
          color: var(--text);
          font-size: 15px;
          margin-top: 2px;
        }

        .loginWelcome {
          margin-bottom: 22px;
        }

        .loginWelcome h2 {
          font-size: 30px;
        }

        .loginWelcome p {
          margin: 7px 0 0;
          color: #61758e;
          font-size: 11px;
          line-height: 1.5;
        }

        .loginFields {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .loginFields label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #365675;
          font-size: 9px;
          font-weight: 800;
        }

        .inputWrapper {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid #d8e0e9;
          border-radius: 10px;
          padding: 0 12px;
          background: #fafbfd;
          transition: .2s;
        }

        .inputWrapper:focus-within {
          border-color: var(--gold);
          background: white;
        }

        .inputWrapper > span {
          color: #a8790d;
          font-size: 11px;
        }

        .inputWrapper input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          padding: 12px 0;
          color: var(--text);
          font-size: 12px;
        }

        .rememberLogin {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 14px 0 15px;
          color: #61758e;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .rememberLogin input {
          width: 15px;
          height: 15px;
          margin: 0;
          accent-color: var(--gold);
          cursor: pointer;
        }

        .loginButton,
        .saveButton {
          width: 100%;
          border: 0;
          background: var(--gold);
          color: var(--blue-deep);
          border-radius: 10px;
          padding: 13px;
          font-size: 11px;
          font-weight: 900;
          transition: .2s;
        }

        .loginButton:hover,
        .saveButton:hover {
          background: var(--gold-light);
          transform: translateY(-1px);
        }

        .loginSecurity {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 15px;
          color: #91a0b1;
          font-size: 8px;
        }

        .loginSecurity span {
          color: #63b987;
          font-size: 7px;
        }

        /* =========================
           FORM
        ========================= */

        .formHeader {
          padding-right: 35px;
        }

        .formHeader p {
          margin: 7px 0 0;
          color: #657991;
          font-size: 11px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 25px;
        }

        .formGrid label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #365675;
          font-size: 9px;
          font-weight: 800;
        }

        .formGrid label.full {
          grid-column: 1 / -1;
        }

        .formGrid input,
        .formGrid textarea {
          width: 100%;
          border: 1px solid #d8e0e9;
          border-radius: 10px;
          padding: 12px;
          outline: none;
          color: #16385f;
          background: #fafbfd;
          font-size: 12px;
          transition: .2s;
        }

        .formGrid input:focus,
        .formGrid textarea:focus {
          border-color: var(--gold);
          background: white;
        }

        .formGrid textarea {
          resize: vertical;
        }

        .formFooter {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 20px;
        }

        .cancelButton {
          border: 1px solid #d7dfe8;
          background: white;
          color: #526b86;
          border-radius: 10px;
          padding: 12px 17px;
          font-size: 10px;
          font-weight: 800;
        }

        .saveButton {
          width: auto;
          min-width: 165px;
        }

        /* =========================
           LOADING SCREEN
        ========================= */

        .loading-screen {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at center,
              #0c397d,
              #061f4c 65%
            );
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loadingContent {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .loadingSymbol {
          color: var(--gold);
          font-size: 22px;
          margin-bottom: 3px;
        }

        .loadingLogo {
          color: var(--gold-light);
          font-family: "Playfair Display", serif;
          font-style: italic;
          font-size: 55px;
        }

        .loadingContent span {
          color: rgba(255,255,255,.5);
          font-size: 8px;
          letter-spacing: 3px;
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

          .headerActions {
            width: 100%;
            justify-content: flex-start;
          }

          .topInfoBar {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .infoDivider {
            display: none;
          }

          .featuredEvent {
            grid-template-columns: 155px 1fr;
          }

          .dayEvents {
            padding-left: 0;
          }

        }

        @media (max-width: 650px) {

          .content {
            width: calc(100% - 20px);
            padding-top: 22px;
            padding-bottom: 45px;
          }

          .header {
            margin-bottom: 22px;
          }

          .brand {
            width: 100%;
            gap: 13px;
            align-items: center;
          }

          .logoArea {
            width: 100px;
            min-width: 100px;
          }

          .logo {
            width: 100px;
            transform: none;
          }

          .brandDivider {
            height: 82px;
          }

          .titleArea {
            min-width: 0;
            flex: 1;
          }

          .smallTitle {
            font-size: 7.5px;
            letter-spacing: 3.2px;
          }

          .titleArea h1 {
            font-size: 51px;
            line-height: .9;
          }

          .subtitle {
            font-size: 6px;
            letter-spacing: 1.5px;
          }

          .titleDecoration {
            margin-top: 10px;
          }

          .titleDecoration span {
            width: 45px;
          }

          .titleDecoration b {
            font-size: 12px;
          }

          .headerActions {
            gap: 6px;
          }

          .outlineButton,
          .goldOutlineButton,
          .logoutButton {
            padding: 8px 10px;
            font-size: 9px;
          }

          .cgStatus {
            padding: 5px 8px;
          }

          .topInfoBar {
            padding: 11px 13px;
            margin-bottom: 16px;
          }

          .infoItem {
            gap: 8px;
          }

          .infoIcon {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
            border-radius: 10px;
          }

          .infoIcon svg {
            width: 16px;
            height: 16px;
          }

          .infoItem strong {
            font-size: 10px;
          }

          .featuredEvent {
            grid-template-columns: 92px 1fr;
            min-height: 165px;
            border-radius: 16px;
          }

          .featuredDate {
            padding: 43px 11px 14px;
          }

          .nextBadge {
            left: 9px;
            padding: 7px 8px;
            font-size: 6px;
          }

          .featuredWeek {
            font-size: 7px;
          }

          .featuredDate strong {
            font-size: 42px;
          }

          .featuredMonth {
            font-size: 13px;
          }

          .featuredInfo {
            font-size: 7px;
            gap: 4px;
          }

          .featuredContent {
            padding: 19px 15px;
          }

          .featuredContent h2 {
            font-size: 20px;
          }

          .featuredContent p {
            font-size: 9px;
            line-height: 1.45;
            margin-bottom: 10px;
          }

          .featuredBottom {
            display: block;
          }

          .daysBadge {
            font-size: 8px;
            padding: 6px 9px;
          }

          .viewDetails {
            display: none;
          }

          .monthSection {
            padding: 30px 0 20px;
          }

          .monthHeader {
            align-items: flex-end;
          }

          .monthTitle {
            gap: 7px;
          }

          .monthTitle h2 {
            font-size: 40px;
          }

          .monthTitle span {
            font-size: 9px;
          }

          .monthControls {
            gap: 5px;
          }

          .todayButton {
            padding: 8px 10px;
            font-size: 8px;
          }

          .monthArrow {
            width: 34px;
            height: 34px;
            font-size: 24px;
          }

          .monthSummary {
            font-size: 9px;
          }

          .dayHeader {
            grid-template-columns: 61px 1fr auto;
            gap: 9px;
          }

          .dayDate strong {
            font-size: 27px;
          }

          .dayDate span {
            font-size: 7px;
          }

          .dayLine span {
            font-size: 7px;
          }

          .dayCount {
            font-size: 12px;
            min-width: 36px;
          }

          .eventCard {
            grid-template-columns: 67px 1fr 20px;
            gap: 10px;
            padding: 10px;
            min-height: 94px;
            border-radius: 13px;
          }

          .eventCardTime {
            padding: 8px 5px;
          }

          .eventCardTime strong {
            font-size: 14px;
          }

          .eventCard h3 {
            font-size: 13px;
          }

          .eventCard p {
            font-size: 8px;
          }

          .eventLocation {
            font-size: 7px;
          }

          .eventCardArrow {
            font-size: 16px;
          }

          .cgPanel {
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 11px;
            padding: 13px;
          }

          .cgPanelText {
            min-width: 0;
            flex: 1;
          }

          .cgPanelText strong {
            font-size: 11px;
          }

          .cgPanelText p {
            font-size: 8px;
          }

          .cgPanelButton {
            width: 100%;
          }

          .eventModal,
          .loginModal,
          .formModal {
            padding: 27px 19px;
            border-radius: 18px;
          }

          .eventModal h2,
          .loginModal h2,
          .formModal h2 {
            font-size: 27px;
          }

          .modalActions {
            flex-direction: column;
          }

          .editButton,
          .deleteButton {
            width: 100%;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .formGrid label.full {
            grid-column: auto;
          }

          .formFooter {
            flex-direction: column-reverse;
          }

          .cancelButton,
          .saveButton {
            width: 100%;
          }

          .decorTopLeft {
            left: -105px;
            opacity: .3;
          }

          .decorTopRight {
            right: -110px;
            opacity: .3;
          }

          .decorBottomLeft,
          .decorBottomRight {
            opacity: .2;
          }

        }

        @media (max-width: 390px) {

          .titleArea h1 {
            font-size: 44px;
          }

          .logoArea {
            width: 90px;
            min-width: 90px;
          }

          .logo {

          
          .brand {
            gap: 10px;
          }

          .featuredEvent {
            grid-template-columns: 82px 1fr;
          }

          .featuredDate strong {
            font-size: 37px;
          }

          .featuredContent {
            padding: 16px 12px;
          }

          .featuredContent h2 {
            font-size: 18px;
          }

          .monthTitle h2 {
            font-size: 35px;
          }

          .eventCard {
            grid-template-columns: 61px 1fr 15px;
            gap: 7px;
          }

          .eventCard h3 {
            font-size: 12px;
          }

        }

      `}</style>

    </main>
  );
}