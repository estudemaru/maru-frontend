import { esc } from "../core/ui.js";

export function bindAccountProviders(ctx, signal) {
  const group = ctx.main.querySelector(".account-providers");
  if (!group) return;
  let pending = false;
  group.addEventListener("click", async event => {
    const link = event.target.closest(".account-provider");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pending) return;
    pending = true;
    group.setAttribute("aria-busy", "true");
    group.querySelectorAll("a").forEach(anchor => anchor.setAttribute("aria-disabled", "true"));
    const feedback = ctx.main.querySelector(".account-provider-feedback");
    if (feedback) feedback.textContent = "Salvando seu progresso antes de entrar…";
    let timeout;
    try {
      // Every answer is already saved locally. Bound this last remote flush so
      // an unavailable connection cannot leave the provider button locked.
      await Promise.race([ctx.flush(), new Promise(resolve => { timeout = setTimeout(resolve, 7000); })]);
      if (!signal.aborted) location.assign(link.href);
    } catch {
      if (!signal.aborted) ctx.toast("Não foi possível abrir o login. Tente novamente.");
    } finally {
      clearTimeout(timeout);
      pending = false;
      group.removeAttribute("aria-busy");
      group.querySelectorAll("a").forEach(anchor => anchor.removeAttribute("aria-disabled"));
      if (feedback) feedback.textContent = "";
    }
  }, { signal });
}

export function accountHTML(ctx, status) {
  const { user, emailEnabled, googleEnabled, discordEnabled, verified } = ctx.account;
  const providerButtons = [
    googleEnabled ? `<a class="btn account-provider account-provider-google" id="google-login" href="/api/auth/google"><span class="provider-mark" aria-hidden="true">G</span>Continuar com Google<span aria-hidden="true">↗</span></a>` : "",
    discordEnabled ? `<a class="btn account-provider account-provider-discord" id="discord-login" href="/api/auth/discord"><svg class="provider-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.7 5.1a18 18 0 0 0-4.4-1.4l-.6 1.2a16 16 0 0 0-5.4 0l-.6-1.2a18 18 0 0 0-4.4 1.4C1.5 9.3.7 13.4 1.1 17.5a18 18 0 0 0 5.4 2.8l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 11.4 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.8c.5-4.8-.8-8.9-3.2-12.4ZM8.5 14.9c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>Continuar com Discord<span aria-hidden="true">↗</span></a>` : ""
  ].join("");
  const socialLogin = providerButtons ? `<div class="account-providers" role="group" aria-label="Outras formas de entrar">${providerButtons}</div><p class="account-provider-feedback small" role="status" aria-live="polite"></p>${emailEnabled ? `<p class="account-divider"><span>ou entre com e-mail</span></p>` : ""}` : "";
  const message = {
    "login-success": "Conta conectada. Seu progresso pode ser sincronizado.",
    "email-confirmed": "E-mail confirmado. Sua conta está pronta.",
    "password-reset": "Link confirmado. Crie uma senha nova abaixo.",
    "email-link-failed": "Este link não pôde ser confirmado. Solicite outro e-mail.",
    "login-failed": "Não foi possível concluir o login. Seu progresso continua neste navegador.",
    "login-unavailable": "O login ainda não está disponível. Você pode continuar estudando sem conta."
  }[status];
  const passwordForm = status === "password-reset" ? `<form id="password-change-form" class="account-form"><label for="new-password">Nova senha</label><input id="new-password" class="text-input" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required><button class="btn btn-primary" type="submit">Salvar nova senha</button><p id="account-feedback" class="account-feedback" role="status" aria-live="polite"></p></form>` : "";
  return `<section class="panel settings-panel account-panel" aria-labelledby="account-title"><p class="eyebrow">SEU APRENDIZADO ACOMPANHA VOCÊ</p><h2 id="account-title">${user ? "Sua conta no Maru" : "Seu lugar, em qualquer aparelho."}</h2>${message ? `<p class="account-notice" role="status">${message}</p>` : ""}
    ${user ? `<p>Olá, <strong>${esc(user.name)}</strong>.</p><p class="small muted">${esc(user.email)}</p><p>${verified ? "Sua conta reúne o progresso salvo neste navegador e no servidor. Ao entrar em outro aparelho, suas lições e revisões continuam com você." : "Você está usando a cópia salva neste navegador. A sincronização volta quando sua conta puder ser confirmada."}</p>${passwordForm}<button class="btn btn-ghost" id="account-logout">Sair desta conta</button>` : `<p>Você pode estudar sem cadastro. Com uma conta, seu progresso acompanha você em outros aparelhos. O que já fez neste navegador será levado para a conta.</p>${socialLogin}${emailEnabled ? `<div class="account-tabs" role="group" aria-label="Acesso à conta"><button type="button" class="btn btn-ghost is-active" id="email-mode-login" aria-pressed="true">Entrar</button><button type="button" class="btn btn-ghost" id="email-mode-signup" aria-pressed="false">Criar conta</button></div><form id="email-account-form" class="account-form"><label for="account-email">E-mail</label><input id="account-email" class="text-input" type="email" name="email" autocomplete="email" autocapitalize="off" spellcheck="false" required maxlength="254"><label for="account-password">Senha</label><input id="account-password" class="text-input" type="password" name="password" autocomplete="current-password" required minlength="8" maxlength="72"><button class="btn btn-primary" type="submit" id="email-submit">Entrar com e-mail</button></form><button type="button" class="text-link" id="email-recover-toggle">Esqueci minha senha</button><form id="email-recover-form" class="account-form" hidden><label for="recover-email">E-mail da conta</label><input id="recover-email" class="text-input" type="email" name="email" autocomplete="email" autocapitalize="off" spellcheck="false" required maxlength="254"><button class="btn btn-ghost" type="submit">Enviar link para redefinir</button></form><p id="account-feedback" class="account-feedback" role="status" aria-live="polite"></p><p class="small muted">Se pedirmos a confirmação do e-mail, abra o link recebido para ativar sua conta.</p>` : (!providerButtons ? `<p class="small muted">O login está temporariamente indisponível. Seu progresso continua salvo neste navegador.</p>` : "")}`}
    <p class="source-note">${emailEnabled && !user ? "Ao criar uma conta por e-mail, use uma senha exclusiva, com pelo menos 8 caracteres, e confira sua caixa de entrada." : "Seu progresso fica ligado à sua conta. Ao usar um aparelho compartilhado, saia quando terminar."}</p></section>`;
}
