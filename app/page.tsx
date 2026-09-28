"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";

type Evento = {
  id: number;
  data: string;
  titulo: string;
  horario: string;
  local: string;
};

export default function Home() {
  const hoje = new Date();

  const [mesAtual, setMesAtual] = useState(hoje.getMonth());
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [usuario, setUsuario] = useState<any>(null);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const nomesMeses = [
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

  useEffect(() => {
    verificarUsuario();
    carregarEventos();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUsuario(session?.user ?? null);
        setCarregandoUsuario(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function verificarUsuario() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setUsuario(session?.user ?? null);
    setCarregandoUsuario(false);
  }

  async function carregarEventos() {
    const { data, error } = await supabase
      .from("eventos")
      .select("*")
      .order("data", { ascending: true })
      .order("horario", { ascending: true });

    if (error) {
      console.error("Erro ao carregar eventos:", error);
      return;
    }

    setEventos(data || []);
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

    setMostrarLogin(false);
    setEmail("");
    setSenha("");
  }

  async function sair() {
    await supabase.auth.signOut();
    setMostrarFormulario(false);
  }

  function compartilharWhatsApp() {
    const mensagem =
      "📅 *Calendário EJC*\n\n" +
      "Confira os próximos eventos e tudo que acontece no EJC:\n\n" +
      window.location.href;

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  function limparFormulario() {
    setTitulo("");
    setData("");
    setHorario("");
    setLocal("");
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  function prepararEdicao(evento: Evento) {
    setEditandoId(evento.id);
    setTitulo(evento.titulo);
    setData(evento.data);
    setHorario(evento.horario.slice(0, 5));
    setLocal(evento.local);
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function salvarEvento() {
    if (!titulo || !data || !horario || !local) {
      alert("Preencha todos os campos.");
      return;
    }

    if (!usuario) {
      alert("Você precisa estar logado para fazer isso.");
      return;
    }

    if (editandoId !== null) {
      const { data: eventoAtualizado, error } = await supabase
        .from("eventos")
        .update({
          titulo,
          data,
          horario,
          local,
        })
        .eq("id", editandoId)
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Erro ao editar evento.");
        return;
      }

      setEventos((anteriores) =>
        anteriores.map((evento) =>
          evento.id === editandoId ? eventoAtualizado : evento
        )
      );

      alert("Evento atualizado com sucesso!");
    } else {
      const { data: novoEvento, error } = await supabase
        .from("eventos")
        .insert({
          titulo,
          data,
          horario,
          local,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Erro ao criar evento.");
        return;
      }

      setEventos((anteriores) =>
        [...anteriores, novoEvento].sort((a, b) => {
          const dataA = `${a.data} ${a.horario}`;
          const dataB = `${b.data} ${b.horario}`;

          return dataA.localeCompare(dataB);
        })
      );

      alert("Evento criado com sucesso!");
    }

    limparFormulario();
  }

  async function excluirEvento(id: number) {
    if (!usuario) {
      alert("Você precisa estar logado para fazer isso.");
      return;
    }

    const confirmar = window.confirm(
      "Tem certeza que deseja excluir este evento?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("eventos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Erro ao excluir evento.");
      return;
    }

    setEventos((anteriores) =>
      anteriores.filter((evento) => evento.id !== id)
    );

    if (editandoId === id) {
      limparFormulario();
    }

    alert("Evento excluído com sucesso!");
  }

  function mudarMes(direcao: number) {
    let novoMes = mesAtual + direcao;
    let novoAno = anoAtual;

    if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }

    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    }

    setMesAtual(novoMes);
    setAnoAtual(novoAno);
  }

  function diasNoMes() {
    return new Date(anoAtual, mesAtual + 1, 0).getDate();
  }

  function primeiroDiaDoMes() {
    return new Date(anoAtual, mesAtual, 1).getDay();
  }

  function eventosDoDia(dia: number) {
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(
      2,
      "0"
    )}-${String(dia).padStart(2, "0")}`;

    return eventos.filter((evento) => evento.data === dataFormatada);
  }

  if (carregandoUsuario) {
    return (
      <main className="loading">
        <div className="loadingBox">
          <div className="loadingIcon">📅</div>
          <p>Carregando calendário...</p>
        </div>
      </main>
    );
  }

  const dias = [];

  for (let i = 0; i < primeiroDiaDoMes(); i++) {
    dias.push(<div className="dia vazio" key={`vazio-${i}`} />);
  }

  for (let dia = 1; dia <= diasNoMes(); dia++) {
    const eventosDia = eventosDoDia(dia);

    const ehHoje =
      dia === hoje.getDate() &&
      mesAtual === hoje.getMonth() &&
      anoAtual === hoje.getFullYear();

    dias.push(
      <div
        key={dia}
        className={`dia ${ehHoje ? "hoje" : ""}`}
      >
        <div className={`numeroDia ${ehHoje ? "numeroHoje" : ""}`}>
          {dia}
        </div>

        <div className="eventosDia">
          {eventosDia.map((evento) => (
            <div className="miniEvento" key={evento.id}>
              <strong>{evento.titulo}</strong>
              <span>{evento.horario.slice(0, 5)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="pagina">
        <div className="container">

          {/* CABEÇALHO */}
          <header className="header">
            <div>
              <div className="logoLinha">
                <div className="logo">EJC</div>

                <div>
                  <h1>Calendário EJC</h1>
                  <p>Confira tudo que acontece no EJC</p>
                </div>
              </div>
            </div>

            <div className="acoesHeader">
              <button
                onClick={compartilharWhatsApp}
                className="btn btnWhatsApp"
              >
                📲 <span>Compartilhar</span>
              </button>

              {usuario ? (
                <>
                  <button
                    onClick={() =>
                      setMostrarFormulario(!mostrarFormulario)
                    }
                    className="btn btnPrincipal"
                  >
                    ➕ <span>Adicionar evento</span>
                  </button>

                  <button
                    onClick={sair}
                    className="btn btnSecundario"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setMostrarLogin(!mostrarLogin)}
                  className="btn btnSecundario"
                >
                  🔐 Área da equipe
                </button>
              )}
            </div>
          </header>

          {/* LOGIN */}
          {mostrarLogin && !usuario && (
            <div className="painel">
              <h2>🔐 Área da equipe</h2>

              <p className="textoSuave">
                Entre para adicionar, editar ou excluir eventos.
              </p>

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />

              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input"
              />

              <div className="botoesFormulario">
                <button
                  onClick={entrar}
                  className="btn btnPrincipal"
                >
                  Entrar
                </button>

                <button
                  onClick={() => setMostrarLogin(false)}
                  className="btn btnSecundario"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* FORMULÁRIO */}
          {usuario && mostrarFormulario && (
            <div className="painel">
              <h2>
                {editandoId !== null
                  ? "✏️ Editar evento"
                  : "➕ Novo evento"}
              </h2>

              <input
                placeholder="Título do evento"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="input"
              />

              <div className="linhaInputs">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="input"
                />

                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="input"
                />
              </div>

              <input
                placeholder="Local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="input"
              />

              <div className="botoesFormulario">
                <button
                  onClick={salvarEvento}
                  className="btn btnPrincipal"
                >
                  💾{" "}
                  {editandoId !== null
                    ? "Salvar alterações"
                    : "Salvar evento"}
                </button>

                <button
                  onClick={limparFormulario}
                  className="btn btnSecundario"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* CALENDÁRIO */}
          <section className="calendarioCard">
            <div className="mesHeader">
              <button
                onClick={() => mudarMes(-1)}
                className="btnMes"
              >
                ←
              </button>

              <div>
                <h2>{nomesMeses[mesAtual]}</h2>
                <span>{anoAtual}</span>
              </div>

              <button
                onClick={() => mudarMes(1)}
                className="btnMes"
              >
                →
              </button>
            </div>

            <div className="diasSemana">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                (dia) => (
                  <div key={dia}>{dia}</div>
                )
              )}
            </div>

            <div className="gradeCalendario">
              {dias}
            </div>
          </section>

          {/* EVENTOS */}
          <section className="eventosSection">
            <div className="tituloSection">
              <div>
                <h2>📌 Próximos eventos</h2>
                <p>Veja o que está programado</p>
              </div>
            </div>

            {eventos.length === 0 ? (
              <div className="semEventos">
                <div>📅</div>
                <p>Nenhum evento cadastrado ainda.</p>
              </div>
            ) : (
              <div className="listaEventos">
                {eventos.map((evento) => (
                  <div className="eventoCard" key={evento.id}>
                    <div className="dataEvento">
                      <strong>
                        {evento.data.slice(8, 10)}
                      </strong>

                      <span>
                        {nomesMeses[
                          Number(evento.data.slice(5, 7)) - 1
                        ].slice(0, 3)}
                      </span>
                    </div>

                    <div className="infoEvento">
                      <h3>{evento.titulo}</h3>

                      <div className="detalhesEvento">
                        <span>
                          🕐 {evento.horario.slice(0, 5)}
                        </span>

                        <span>📍 {evento.local}</span>
                      </div>
                    </div>

                    {usuario && (
                      <div className="acoesEvento">
                        <button
                          onClick={() => prepararEdicao(evento)}
                          className="btnAcao editar"
                          title="Editar"
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => excluirEvento(evento.id)}
                          className="btnAcao excluir"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer>
            <strong>Calendário EJC</strong>
            <span>Organização e informação em um só lugar.</span>
          </footer>
        </div>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #f5f7fa;
          color: #172033;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          transition: 0.2s ease;
        }

        button:hover {
          transform: translateY(-1px);
        }

        .pagina {
          min-height: 100vh;
          padding: 30px 20px 50px;
          background:
            radial-gradient(
              circle at top right,
              rgba(245, 158, 11, 0.08),
              transparent 30%
            ),
            #f5f7fa;
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .logoLinha {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo {
          width: 52px;
          height: 52px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f59e0b;
          color: white;
          font-weight: 900;
          font-size: 14px;
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25);
        }

        h1 {
          margin: 0;
          font-size: 30px;
          letter-spacing: -1px;
        }

        .header p {
          margin: 5px 0 0;
          color: #718096;
        }

        .acoesHeader {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .btn {
          border: 0;
          border-radius: 10px;
          padding: 11px 15px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }

        .btnPrincipal {
          background: #f59e0b;
          color: white;
          box-shadow: 0 5px 15px rgba(245, 158, 11, 0.2);
        }

        .btnSecundario {
          background: white;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .btnWhatsApp {
          background: #25d366;
          color: white;
          box-shadow: 0 5px 15px rgba(37, 211, 102, 0.18);
        }

        .painel {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 22px;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
        }

        .painel h2 {
          margin: 0 0 7px;
        }

        .textoSuave {
          color: #718096;
          margin-top: 0;
        }

        .input {
          width: 100%;
          padding: 13px 14px;
          border: 1px solid #dbe2ea;
          border-radius: 10px;
          outline: none;
          font-size: 15px;
          margin-bottom: 10px;
          background: white;
        }

        .input:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
        }

        .linhaInputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .botoesFormulario {
          display: flex;
          gap: 8px;
          margin-top: 3px;
        }

        .calendarioCard {
          background: white;
          border-radius: 20px;
          border: 1px solid #e8edf3;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .mesHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          text-align: center;
        }

        .mesHeader h2 {
          margin: 0;
          font-size: 23px;
        }

        .mesHeader span {
          color: #94a3b8;
          font-size: 14px;
        }

        .btnMes {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: #f8fafc;
          cursor: pointer;
          font-size: 21px;
        }

        .btnMes:hover {
          background: #fef3c7;
        }

        .diasSemana {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f8fafc;
          border-top: 1px solid #edf1f5;
          border-bottom: 1px solid #edf1f5;
        }

        .diasSemana div {
          padding: 11px 5px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .gradeCalendario {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .dia {
          min-height: 115px;
          padding: 9px;
          border-right: 1px solid #edf1f5;
          border-bottom: 1px solid #edf1f5;
          background: white;
        }

        .dia:nth-child(7n) {
          border-right: 0;
        }

        .dia.vazio {
          background: #fafbfc;
        }

        .dia.hoje {
          background: #fffbeb;
        }

        .numeroDia {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
        }

        .numeroHoje {
          background: #f59e0b;
          color: white;
          box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
        }

        .eventosDia {
          margin-top: 5px;
        }

        .miniEvento {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: #fff7df;
          border-left: 3px solid #f59e0b;
          padding: 5px 6px;
          border-radius: 6px;
          margin-top: 4px;
          font-size: 10px;
          overflow: hidden;
        }

        .miniEvento strong {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .miniEvento span {
          color: #8a6a19;
        }

        .eventosSection {
          margin-top: 30px;
        }

        .tituloSection {
          margin-bottom: 14px;
        }

        .tituloSection h2 {
          margin: 0;
          font-size: 22px;
        }

        .tituloSection p {
          margin: 5px 0 0;
          color: #94a3b8;
        }

        .listaEventos {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .eventoCard {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 15px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 5px 15px rgba(15, 23, 42, 0.035);
        }

        .dataEvento {
          width: 55px;
          min-width: 55px;
          height: 55px;
          border-radius: 13px;
          background: #fff7df;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #b45309;
        }

        .dataEvento strong {
          font-size: 19px;
          line-height: 19px;
        }

        .dataEvento span {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .infoEvento {
          flex: 1;
          min-width: 0;
        }

        .infoEvento h3 {
          margin: 0 0 7px;
          font-size: 16px;
        }

        .detalhesEvento {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: #718096;
          font-size: 13px;
        }

        .acoesEvento {
          display: flex;
          gap: 6px;
        }

        .btnAcao {
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 9px;
          cursor: pointer;
        }

        .editar {
          background: #e0f2fe;
        }

        .excluir {
          background: #fee2e2;
        }

        .semEventos {
          background: white;
          border: 1px solid #e8edf3;
          border-radius: 15px;
          padding: 30px;
          text-align: center;
          color: #94a3b8;
        }

        .semEventos div {
          font-size: 30px;
        }

        footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          margin-top: 40px;
          color: #94a3b8;
          font-size: 12px;
          text-align: center;
        }

        .loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f7fa;
        }

        .loadingBox {
          text-align: center;
          color: #64748b;
        }

        .loadingIcon {
          font-size: 40px;
          margin-bottom: 10px;
        }

        @media (max-width: 700px) {
          .pagina {
            padding: 15px 10px 35px;
          }

          .header {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 18px;
          }

          .header h1 {
            font-size: 24px;
          }

          .header p {
            font-size: 13px;
          }

          .logo {
            width: 46px;
            height: 46px;
            border-radius: 13px;
          }

          .acoesHeader {
            width: 100%;
            justify-content: stretch;
          }

          .acoesHeader .btn {
            flex: 1;
          }

          .calendarioCard {
            border-radius: 15px;
          }

          .mesHeader {
            padding: 15px;
          }

          .mesHeader h2 {
            font-size: 19px;
          }

          .btnMes {
            width: 38px;
            height: 38px;
          }

          .diasSemana div {
            font-size: 10px;
            padding: 9px 2px;
          }

          .dia {
            min-height: 76px;
            padding: 5px;
          }

          .numeroDia {
            width: 25px;
            height: 25px;
            font-size: 11px;
          }

          .miniEvento {
            padding: 4px;
            font-size: 8px;
            border-left-width: 2px;
          }

          .miniEvento span {
            font-size: 8px;
          }

          .linhaInputs {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .eventoCard {
            padding: 11px;
            gap: 10px;
          }

          .dataEvento {
            width: 48px;
            min-width: 48px;
            height: 48px;
          }

          .dataEvento strong {
            font-size: 16px;
          }

          .dataEvento span {
            font-size: 9px;
          }

          .infoEvento h3 {
            font-size: 14px;
          }

          .detalhesEvento {
            flex-direction: column;
            gap: 3px;
            font-size: 11px;
          }

          .btnAcao {
            width: 32px;
            height: 32px;
          }

          .painel {
            padding: 16px;
            border-radius: 15px;
          }
        }

        @media (max-width: 400px) {
          .dia {
            min-height: 68px;
          }

          .miniEvento {
            font-size: 7px;
          }

          .miniEvento span {
            display: none;
          }

          .eventoCard {
            gap: 8px;
          }

          .acoesEvento {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}