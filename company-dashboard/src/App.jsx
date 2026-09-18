import React, { useCallback, useEffect, useState } from "react";
import Marketplace from "./Marketplace.jsx";
import { restoreMarketplaceIntent, claimTrial } from "./marketplace-intent.js";
import { paymentTotals, searchesUsed, contentMatches } from "./workflow.js";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Sparkles,
  LayoutDashboard,
  Users,
  Bookmark,
  Briefcase,
  Globe,
  MessageCircle,
  Palette,
  CreditCard,
  ChartNoAxesCombined,
  Bell,
  Settings,
  Building2,
  LogOut,
  Menu,
  X,
  Check,
  Lock,
  RefreshCw,
  ChevronRight,
  Download,
  Grid2X2,
  List,
  Star,
} from "lucide-react";
import {
  db,
  checked,
  money,
  count,
  date,
  initials,
  formData,
  niches,
  stages,
  parseCriteria,
  exportCSV,
} from "./lib";

restoreMarketplaceIntent();
const sections = [
  ["Overview", LayoutDashboard],
  ["Marketplace", Users],
  ["Cart", CreditCard],
  ["IVRE AI", Sparkles],
  ["Creators", Users],
  ["Shortlists", Bookmark],
  ["Campaigns", Briefcase],
  ["Open Campaigns", Globe],
  ["Messages", MessageCircle],
  ["Creative AI", Palette],
  ["Payments", CreditCard],
  ["Analytics", ChartNoAxesCombined],
  ["Notifications", Bell],
  ["Team", Users],
  ["Company Profile", Building2],
  ["Billing", CreditCard],
  ["Settings", Settings],
];
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
function Tag({ children }) {
  return (
    <span className="tag">{String(children || "").replaceAll("_", " ")}</span>
  );
}
function Empty({ title = "Nothing here yet", text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Briefcase size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Heading({ label, title, text, children }) {
  return (
    <div className="section-heading">
      <div>
        <small>{label}</small>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([label, value, detail]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
          <span>{detail}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null),
    [ready, setReady] = useState(false),
    [workspaceLoading, setWorkspaceLoading] = useState(true),
    [company, setCompany] = useState(null),
    [memberships, setMemberships] = useState([]),
    [role, setRole] = useState("viewer");
  const [page, setPage] = useState(
      new URLSearchParams(location.search).has("recovery")
        ? "Settings"
        : ["Marketplace", "Cart", "Checkout", "Billing"].includes(new URLSearchParams(location.search).get("page"))
          ? new URLSearchParams(location.search).get("page") : "Overview",
    ),
    [data, setData] = useState({
      campaigns: [],
      apps: [],
      invites: [],
      shortlists: [],
      links: [],
      searches: [],
      payments: [],
      activity: [],
      content: [],
      assets: [],
      members: [],
      teamInvites: [],
    });
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [editCampaign, setEditCampaign] = useState(null),
    [activeCampaign, setActiveCampaign] = useState(null),
    [results, setResults] = useState(null),
    [query, setQuery] = useState("");
  const run = async (fn) => {
    setBusy(true);
    setNotice("");
    try {
      return await fn();
    } catch (e) {
      setNotice(e.message || "Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const load = useCallback(async (cid) => {
    const tables = {
      campaigns: () =>
        db
          .from("campaigns")
          .select("*")
          .eq("company_id", cid)
          .order("created_at", { ascending: false }),
      shortlists: () =>
        db.from("company_shortlists").select("*").eq("company_id", cid),
      links: () =>
        db.from("company_creator_links").select("*").eq("company_id", cid),
      searches: () =>
        db
          .from("company_searches")
          .select("*")
          .eq("company_id", cid)
          .order("created_at", { ascending: false }),
      payments: () =>
        db.from("company_payments").select("*").eq("company_id", cid),
      activity: () =>
        db
          .from("company_activity")
          .select("*")
          .eq("company_id", cid)
          .order("created_at", { ascending: false })
          .limit(100),
      assets: () => db.from("company_assets").select("*").eq("company_id", cid),
      members: () =>
        db.from("company_members").select("*").eq("company_id", cid),
      teamInvites: () =>
        db.from("company_team_invites").select("*").eq("company_id", cid),
    };
    const entries = await Promise.all(
      Object.entries(tables).map(async ([k, f]) => [k, await checked(f())]),
    );
    const next = Object.fromEntries(entries);
    const ids = next.campaigns.map((c) => c.id);
    next.apps = ids.length
      ? await checked(
          db
            .from("campaign_applications")
            .select("*,creator_profiles(*)")
            .in("campaign_id", ids)
            .order("match_score", { ascending: false }),
        )
      : [];
    next.invites = ids.length
      ? await checked(
          db.from("campaign_invitations").select("*").in("campaign_id", ids),
        )
      : [];
    const aids = next.apps.map((a) => a.id);
    next.content = aids.length
      ? await checked(
          db
            .from("campaign_content")
            .select("*")
            .in("application_id", aids)
            .order("created_at", { ascending: false }),
        )
      : [];
    setData(next);
    setCompany(
      await checked(
        db.from("company_profiles").select("*").eq("id", cid).single(),
      ),
    );
  }, []);
  useEffect(() => {
    let live = true,
      clearing = new URLSearchParams(location.search).get("mode") === "signup";
    (async () => {
      const { data } = await db.auth.getSession();
      if (clearing) await db.auth.signOut({ scope: "local" });
      if (live) {
        setSession(clearing ? null : data.session);
        setReady(true);
        clearing = false;
      }
    })();
    const { data: l } = db.auth.onAuthStateChange((event, s) => {
      if (live && !clearing) {
        setSession(s);
        setReady(true);
        if (event === "PASSWORD_RECOVERY") setPage("Settings");
      }
    });
    return () => {
      live = false;
      l.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session) {
      setWorkspaceLoading(false);
      setCompany(null);
      setMemberships([]);
      return;
    }
    let live = true;
    setWorkspaceLoading(true);
    (async () => {
      try {
        await checked(db.rpc("accept_company_invites"));
        const ms = await checked(
          db
            .from("company_members")
            .select("*,company_profiles(company_name)")
            .eq("user_id", session.user.id),
        );
        if (!live) return;
        setMemberships(ms);
        if (ms.length) {
          setRole(ms[0].role);
          await claimTrial(session, ms[0].company_id);
          await load(ms[0].company_id);
        }
      } catch (e) {
        if (live) setNotice(e.message);
      } finally {
        if (live) setWorkspaceLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [session?.user.id, load]);
  useEffect(() => {
    if (!company) return;
    const cid = company.id;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        load(cid).catch((e) => setNotice(e.message));
    }, 20000);
    return () => clearInterval(timer);
  }, [company?.id, load]);
  const refresh = () => load(company.id);
  const navigate = (p) => {
    setPage(p);
    setActiveCampaign(null);
    setMobile(false);
  };
  const search = async (text, filters = parseCriteria(text)) =>
    run(async () => {
      const r = await checked(
        db.rpc("company_search_creators", {
          cid: company.id,
          query_text: text,
          criteria: filters,
        }),
      );
      setResults(r);
      setQuery(text);
      setPage("IVRE AI");
      await refresh();
    });
  if (!ready) return <div className="loading">Opening IVRE…</div>;
  if (!session) return <Auth onError={setNotice} notice={notice} />;
  if (workspaceLoading)
    return <div className="loading">Opening your company workspace…</div>;
  if (!company)
    return (
      <Onboarding
        session={session}
        notice={notice}
        busy={busy}
        onSubmit={(details) =>
          run(async () => {
            const cid = await checked(
              db.rpc("create_company_workspace", { details }),
            );
            setRole("owner");
            await claimTrial(session, cid);
            await load(cid);
          })
        }
      />
    );
  const ctx = {
    company,
    data,
    role,
    session,
    run,
    refresh,
    navigate,
    busy,
    setNotice,
  };
  const apps = data.apps,
    content = data.content,
    pending =
      apps.filter((a) => a.status === "submitted").length +
      content.filter((c) => c.status === "submitted").length;
  const campaignCards = (cs) =>
    cs.length ? (
      <div className="campaign-grid">
        {cs.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            apps={apps.filter((a) => a.campaign_id === c.id)}
            onOpen={() => {
              setActiveCampaign(c.id);
              setPage("Campaigns");
            }}
          />
        ))}
      </div>
    ) : (
      <Empty
        title="Your next campaign starts here."
        text="Publish a brief and let the right creators come to you."
        action={
          <button onClick={() => setEditCampaign({})}>
            <Plus size={16} />
            Create campaign
          </button>
        }
      />
    );
  return (
    <div className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a className="logo" href="https://ivre.in/">
          ivre<span>COMPANY WORKSPACE</span>
        </a>
        <small className="nav-label">YOUR WORKSPACE</small>
        <nav>
          {sections.map(([p, Icon], i) => (
            <button
              key={p}
              className={
                (page === p ? "active " : "") + (i === 11 ? "divider" : "")
              }
              onClick={() => navigate(p)}
            >
              <Icon size={17} />
              {p}
              {p === "Notifications" && pending > 0 && <b>{pending}</b>}
            </button>
          ))}
        </nav>
        <div className="plan-block">
          <span>
            {company.plan === "free"
              ? "NEWCOMER PLAN"
              : company.plan.toUpperCase()}
          </span>
          <strong>
            {data.campaigns.length} / {company.campaign_limit} campaigns
          </strong>
          <button onClick={() => navigate("Billing")}>
            Explore plans <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="account">
          <div className="avatar">{initials(company.company_name)}</div>
          <span>
            {company.company_name}
            <small>{role.replaceAll("_", " ")}</small>
          </span>
          <button
            className="icon"
            aria-label="Sign out"
            onClick={() => run(() => db.auth.signOut({ scope: "local" }))}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main>
        <header>
          <button
            className="icon mobile"
            onClick={() => setMobile(!mobile)}
            aria-label="Toggle navigation"
          >
            <Menu />
          </button>
          <div>
            <small>IVRE / COMPANY</small>
            <strong>{page}</strong>
          </div>
          <div className="header-actions">
            {memberships.length > 1 && (
              <select
                aria-label="Workspace"
                value={company.id}
                onChange={(e) =>
                  run(async () => {
                    const m = memberships.find(
                      (x) => x.company_id === e.target.value,
                    );
                    setRole(m.role);
                    setResults(null);
                    await load(m.company_id);
                  })
                }
              >
                {memberships.map((m) => (
                  <option key={m.company_id} value={m.company_id}>
                    {m.company_profiles.company_name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="icon"
              aria-label="Refresh workspace"
              onClick={() => run(refresh)}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon notification"
              aria-label="Notifications"
              onClick={() => navigate("Notifications")}
            >
              <Bell size={19} />
              {pending > 0 && <i />}
            </button>
            <div className="avatar pale">{initials(company.company_name)}</div>
          </div>
        </header>
        <div className="page">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                className="icon"
                onClick={() => setNotice("")}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {busy && (
            <div className="working" role="status">
              Saving / loading…
            </div>
          )}
          {page === "Overview" && (
            <>
              <Heading
                label={new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${company.company_name}.`}
                text="Your next great collaboration starts with a question."
              >
                <button onClick={() => setEditCampaign({})}>
                  <Plus size={16} />
                  Create campaign
                </button>
              </Heading>
              <SearchBox
                company={company}
                searches={data.searches}
                onSearch={search}
                busy={busy}
              />
              <Stats
                items={[
                  [
                    "Campaigns",
                    data.campaigns.filter((c) => c.status === "published")
                      .length,
                    `${data.campaigns.filter((c) => c.status === "draft").length} drafts`,
                  ],
                  [
                    "Creator network",
                    data.links.length,
                    `${apps.filter((a) => a.status === "accepted").length} confirmed`,
                  ],
                  [
                    "Recorded spend",
                    money(
                      data.payments
                        .filter((p) => p.status === "paid")
                        .reduce((s, p) => s + Number(p.amount), 0),
                    ),
                    "Completed payment records",
                  ],
                  ["Needs attention", pending, "Applications and content"],
                ]}
              />
              <div className="attention">
                <span>NEEDS YOUR ATTENTION</span>
                <button onClick={() => navigate("Open Campaigns")}>
                  {apps.filter((a) => a.status === "submitted").length} new
                  applications <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate("Campaigns")}>
                  {content.filter((c) => c.status === "submitted").length}{" "}
                  content approvals <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate("Payments")}>
                  {data.payments.filter((p) => p.status === "pending").length}{" "}
                  pending payments <ArrowRight size={16} />
                </button>
              </div>
              <Heading label="MOVE IDEAS FORWARD" title="Your campaigns" />
              {campaignCards(data.campaigns.slice(0, 4))}
              <Activity items={data.activity.slice(0, 5)} />
            </>
          )}
          {page === "IVRE AI" && (
            <Discovery
              {...ctx}
              results={results}
              setResults={setResults}
              query={query}
              setQuery={setQuery}
              onSearch={search}
            />
          )}
          {page === "Creators" && <CreatorLibrary {...ctx} />}
          {["Marketplace", "Cart", "Checkout"].includes(page) && <Marketplace {...ctx} page={page} />}
          {page === "Shortlists" && <Shortlists {...ctx} />}
          {(page === "Campaigns" || page === "Open Campaigns") &&
            (activeCampaign ? (
              <CampaignDetail
                {...ctx}
                campaign={data.campaigns.find((c) => c.id === activeCampaign)}
                onBack={() => setActiveCampaign(null)}
                onEdit={setEditCampaign}
              />
            ) : (
              <Campaigns
                {...ctx}
                openOnly={page === "Open Campaigns"}
                cards={campaignCards}
                onCreate={() => setEditCampaign({})}
                onOpen={(id) => setActiveCampaign(id)}
              />
            ))}
          {page === "Messages" && <Messages {...ctx} />}
          {page === "Creative AI" && <Creative {...ctx} />}
          {page === "Payments" && <Payments {...ctx} />}
          {page === "Analytics" && <Analytics {...ctx} />}
          {page === "Notifications" && (
            <>
              <Heading
                label="STAY UP TO DATE"
                title="Workspace activity"
                text="Applications, invitations, content and messages update here automatically."
              />
              <Activity items={data.activity} />
              <Heading title="Upcoming deadlines" />
              {apps
                .filter((a) => a.content_deadline && a.lifecycle !== "paid")
                .map((a) => (
                  <div className="row" key={a.id}>
                    <strong>{a.creator_profiles?.full_name}</strong>
                    <span>{date(a.content_deadline)}</span>
                    <Tag>
                      {a.content_deadline <
                      new Date().toISOString().slice(0, 10)
                        ? "overdue"
                        : "on track"}
                    </Tag>
                  </div>
                ))}
            </>
          )}
          {page === "Team" && <Team {...ctx} />}
          {page === "Company Profile" && <CompanyProfile {...ctx} />}
          {page === "Billing" && <Billing {...ctx} />}
          {page === "Settings" && <AccountSettings {...ctx} />}
        </div>
      </main>
      {editCampaign && (
        <CampaignForm
          {...ctx}
          campaign={editCampaign}
          onClose={() => setEditCampaign(null)}
          onSaved={(id) => {
            setEditCampaign(null);
            setActiveCampaign(id);
            setPage("Campaigns");
          }}
        />
      )}
    </div>
  );
}

function Auth({ notice, onError }) {
  const params = new URLSearchParams(location.search);
  const [mode, setMode] = useState(
      params.get("mode") === "signup" ? "signup" : "signin",
    ),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    onError("");
    const f = formData(e.currentTarget);
    try {
      if (mode === "signin")
        await checked(
          db.auth.signInWithPassword({ email: f.email, password: f.password }),
        );
      else {
        const d = await checked(
          db.auth.signUp({
            email: f.email,
            password: f.password,
            options: {
              emailRedirectTo: location.origin,
              data: {
                requested_portal: "company",
                full_name: f.full_name,
                company_name: f.company_name,
                website: params.get("website") || "",
                industry: params.get("industry") || "",
              },
            },
          }),
        );
        if (!d.session)
          onError(
            "Check your email to confirm your account, then sign in here.",
          );
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth">
      <section className="auth-story">
        <a className="logo" href="https://ivre.in/">
          ivre<span>FOR COMPANIES</span>
        </a>
        <div>
          <small>CREATORS. CAMPAIGNS. CONNECTIONS.</small>
          <h1>
            Your brand.
            <br />
            Their voice.
            <br />
            <em>Real impact.</em>
          </h1>
          <p>
            Find your people. Publish your brief. Bring every collaboration
            together in one workspace.
          </p>
          <div className="benefits">
            <span>1 free discovery search</span>
            <span>1 free campaign</span>
            <span>Real creator storefronts</span>
          </div>
        </div>
        <small>WIN WITH US. OR WATCH US WIN.</small>
      </section>
      <section className="auth-panel">
        <form onSubmit={submit}>
          <small>COMPANY ACCESS</small>
          <h2>
            {mode === "signup"
              ? "Build your brand workspace."
              : "Welcome back."}
          </h2>
          <p>Where your next creator campaign begins.</p>
          <div className="tabs">
            <button
              type="button"
              className={mode === "signin" ? "selected" : ""}
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "selected" : ""}
              onClick={() => setMode("signup")}
            >
              Create company account
            </button>
          </div>
          {mode === "signup" && (
            <>
              <Field
                label="Your name"
                name="full_name"
                required
                autoComplete="name"
              />
              <Field
                label="Company name"
                name="company_name"
                required
                defaultValue={params.get("company_name") || ""}
              />
            </>
          )}
          <Field
            label="Work email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={params.get("email") || ""}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
          />
          {notice && <p className="notice">{notice}</p>}
          <button className="wide" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              const email = document.querySelector("[name=email]").value;
              if (!email) return onError("Enter your work email first.");
              const { error } = await db.auth.resetPasswordForEmail(email, {
                redirectTo: location.origin + "/?recovery=1",
              });
              onError(
                error
                  ? error.message
                  : "Password reset email requested. Check your inbox.",
              );
            }}
          >
            Forgot password?
          </button>
          <p className="fine">
            Looking for creator opportunities?{" "}
            <a href="https://app.ivre.in/">Creator login</a>
          </p>
        </form>
      </section>
    </div>
  );
}
function Onboarding({ session, onSubmit, notice, busy }) {
  return (
    <div className="onboard">
      <a className="logo dark" href="https://ivre.in/">
        ivre<span>COMPANY WORKSPACE</span>
      </a>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData(e.currentTarget));
        }}
      >
        <small>WELCOME TO IVRE</small>
        <h1>Make yourself at home.</h1>
        <p>
          Start with your company. Add your brand details and assets any time.
        </p>
        <div className="form-grid">
          <Field
            label="Company name"
            name="company_name"
            required
            defaultValue={session.user.user_metadata?.company_name || ""}
          />
          <Field
            label="Website"
            name="website"
            defaultValue={session.user.user_metadata?.website || ""}
            type="url"
            placeholder="https://"
          />
          <Field
            label="Industry"
            name="industry"
            defaultValue={session.user.user_metadata?.industry || ""}
            required
          />
          <Field label="City" name="city" required />
          <Field label="Country" name="country" defaultValue="India" required />
          <Field label="Phone" name="phone" type="tel" />
        </div>
        <div className="benefit-box">
          Your newcomer benefits: 3 searches · 5 profiles per search · 1
          campaign
        </div>
        {notice && <p className="notice">{notice}</p>}
        <button disabled={busy}>
          Create workspace <ArrowRight size={17} />
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => db.auth.signOut({ scope: "local" })}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
function SearchBox({ company, searches, onSearch, busy, initial = "" }) {
  const [text, setText] = useState(initial);
  useEffect(() => setText(initial), [initial]);
  const used = searchesUsed(searches, company.plan);
  return (
    <section className="ai-hero">
      <div className="hero-art">✦</div>
      <small>
        <Sparkles size={14} /> IVRE CREATOR DISCOVERY
      </small>
      <h2>
        What creators are
        <br />
        you looking for?
      </h2>
      <p>Tell us the niche, city, audience, follower range and budget.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(text);
        }}
      >
        <textarea
          aria-label="Describe creators"
          required
          minLength={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Find food creators in Mumbai with 10k–50k followers, 5%+ engagement and a budget under ₹5,000 per Reel."
        />
        <div>
          <span>
            {Math.max(0, company.search_limit - used)} / {company.search_limit}{" "}
            searches remaining
          </span>
          <button disabled={busy}>
            Find creators <ArrowUpRight size={18} />
          </button>
        </div>
      </form>
      <div className="suggestions">
        {[
          "Food creators in Mumbai",
          "Fashion creators in Delhi",
          "Fitness creators under ₹10000",
        ].map((t) => (
          <button key={t} onClick={() => setText(t)}>
            {t}
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}
function CampaignCard({ campaign: c, apps, onOpen }) {
  const confirmed = apps.filter((a) =>
    ["accepted", "completed"].includes(a.status),
  ).length;
  return (
    <button className="campaign-card" onClick={onOpen}>
      <div className="card-top">
        <div className="avatar pale">{initials(c.brand_name)}</div>
        <Tag>
          {c.status === "published"
            ? "active"
            : c.status === "closed"
              ? "completed"
              : c.status}
        </Tag>
      </div>
      <small>
        {c.campaign_code} ·{" "}
        {c.visibility === "public" ? "OPEN CAMPAIGN" : "PRIVATE CAMPAIGN"}
      </small>
      <h3>{c.name}</h3>
      <p>
        {c.niche} · {c.location}
      </p>
      <div className="card-facts">
        <span>
          <strong>
            {confirmed}/{c.required_creators}
          </strong>
          creators confirmed
        </span>
        <span>
          <strong>{money(c.total_budget)}</strong>campaign budget
        </span>
      </div>
      <div className="progress">
        <i
          style={{
            width: `${Math.min(100, (confirmed / c.required_creators) * 100)}%`,
          }}
        />
      </div>
      <div className="card-bottom">
        <span>Apply by {date(c.application_deadline)}</span>
        <ArrowUpRight size={19} />
      </div>
    </button>
  );
}
function Activity({ items }) {
  return (
    <section className="panel activity">
      <h3>Latest activity</h3>
      {items.length ? (
        items.map((a) => (
          <div key={a.id}>
            <span className="activity-dot" />
            <p>
              {a.message}
              <small>{new Date(a.created_at).toLocaleString()}</small>
            </p>
          </div>
        ))
      ) : (
        <p className="muted">Your campaign activity will appear here.</p>
      )}
    </section>
  );
}

function Campaigns({ data, cards, onCreate, openOnly, onOpen }) {
  const [filter, setFilter] = useState("All");
  const cs = data.campaigns.filter(
    (c) =>
      (!openOnly || c.visibility === "public") &&
      (filter === "All" ||
        (filter === "Drafts" && c.status === "draft") ||
        (filter === "Completed" && c.status === "closed") ||
        (filter === "Active" &&
          c.status === "published" &&
          (!c.campaign_start ||
            c.campaign_start <= new Date().toISOString().slice(0, 10))) ||
        (filter === "Upcoming" &&
          c.status === "published" &&
          c.campaign_start > new Date().toISOString().slice(0, 10))),
  );
  return (
    <>
      <Heading
        label="YOUR CAMPAIGN STUDIO"
        title={
          openOnly
            ? "Let the right creators find you."
            : "From first idea to final post."
        }
        text="One brief. Every creator. A clear view of what happens next."
      >
        <button onClick={onCreate}>
          <Plus size={17} />
          Create campaign
        </button>
      </Heading>
      <div className="tabs">
        {["All", "Active", "Upcoming", "Drafts", "Completed"].map((t) => (
          <button
            className={t === filter ? "selected" : ""}
            key={t}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {cards(cs)}
      {openOnly && (
        <>
          <Heading title="New applications" />
          {data.apps
            .filter((a) => a.status === "submitted")
            .map((a) => (
              <button
                className="row"
                key={a.id}
                onClick={() => onOpen(a.campaign_id)}
              >
                <strong>{a.creator_profiles?.full_name}</strong>
                <span>{a.match_score}% campaign match</span>
                <span>{money(a.proposed_price)}</span>
                <ArrowRight size={16} />
              </button>
            ))}
        </>
      )}
    </>
  );
}
function CampaignForm({
  company,
  campaign: c,
  onClose,
  onSaved,
  run,
  refresh,
  busy,
}) {
  const [error, setError] = useState("");
  const save = async (e) => {
    e.preventDefault();
    const f = formData(e.currentTarget);
    const status = e.nativeEvent.submitter.value;
    const values = {
      ...f,
      company_id: company.id,
      brand_name: company.company_name,
      status,
      created_by: null,
      deliverables: f.deliverables
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      campaign_start: f.campaign_start || null,
      campaign_end: f.campaign_end || null,
    };
    for (const key of [
      "follower_min",
      "follower_max",
      "engagement_min",
      "required_creators",
      "budget_min",
      "budget_max",
      "total_budget",
    ])
      values[key] = Number(values[key]);
    if (
      values.follower_min > values.follower_max ||
      values.budget_min > values.budget_max
    ) {
      setError("Maximum values must be greater than minimum values.");
      return;
    }
    const result = await run(async () => {
      const row = await checked(
        c.id
          ? db.from("campaigns").update(values).eq("id", c.id).select().single()
          : db.from("campaigns").insert(values).select().single(),
      );
      await refresh();
      return row;
    });
    if (result) onSaved(result.id);
    else
      setError(
        "Campaign could not be saved. Check the workspace message for details.",
      );
  };
  return (
    <Modal
      title={c.id ? "Edit campaign" : "Create a campaign"}
      onClose={onClose}
    >
      <form onSubmit={save}>
        <p className="muted">
          Public campaigns appear in the creator marketplace as soon as you
          publish.
        </p>
        <Field
          label="Campaign name"
          name="name"
          required
          defaultValue={c.name}
        />
        <div className="form-grid">
          <Field
            label="Objective"
            name="objective"
            defaultValue={c.objective}
          />
          <Field
            label="Product / service"
            name="product"
            defaultValue={c.product}
          />
        </div>
        <Field label="Campaign brief">
          <textarea
            name="description"
            required
            defaultValue={c.description}
            placeholder="What should creators know about the brand, the idea and the outcome?"
          />
        </Field>
        <div className="form-grid">
          <Field label="Visibility">
            <select name="visibility" defaultValue={c.visibility || "public"}>
              <option value="public">Open — all creators can discover</option>
              <option value="private">Private — invited creators only</option>
            </select>
          </Field>
          <Field label="Platform / format">
            <select
              name="campaign_type"
              defaultValue={c.campaign_type || "Instagram Reels"}
            >
              {[
                "Instagram Reels",
                "Instagram Stories",
                "YouTube",
                "TikTok",
                "UGC",
                "Event coverage",
              ].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Niche">
            <select name="niche" defaultValue={c.niche || "Food"}>
              {niches.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Location"
            name="location"
            defaultValue={c.location || company.city}
            required
          />
          <Field label="Creator type">
            <select
              name="creator_type"
              defaultValue={c.creator_type || "Micro Creator"}
            >
              {[
                "Nano Creator",
                "Micro Creator",
                "Macro Creator",
                "UGC Creator",
              ].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Creators required"
            name="required_creators"
            type="number"
            min="1"
            max={company.plan === "free" ? 5 : 10000}
            defaultValue={c.required_creators || 5}
            required
          />
          <Field
            label="Minimum followers"
            name="follower_min"
            type="number"
            min="0"
            defaultValue={c.follower_min ?? 0}
            required
          />
          <Field
            label="Maximum followers"
            name="follower_max"
            type="number"
            min="0"
            defaultValue={c.follower_max ?? 100000}
            required
          />
          <Field
            label="Minimum engagement %"
            name="engagement_min"
            type="number"
            min="0"
            max="100"
            step="0.1"
            defaultValue={c.engagement_min ?? 0}
            required
          />
          <Field label="Language" name="language" defaultValue={c.language} />
          <Field
            label="Minimum per creator ₹"
            name="budget_min"
            type="number"
            min="0"
            defaultValue={c.budget_min ?? 3000}
            required
          />
          <Field
            label="Maximum per creator ₹"
            name="budget_max"
            type="number"
            min="0"
            defaultValue={c.budget_max ?? 5000}
            required
          />
          <Field
            label="Total campaign budget ₹"
            name="total_budget"
            type="number"
            min="0"
            defaultValue={c.total_budget ?? 25000}
            required
          />
          <Field
            label="Application deadline"
            name="application_deadline"
            type="date"
            defaultValue={c.application_deadline}
            required
          />
          <Field
            label="Campaign start"
            name="campaign_start"
            type="date"
            defaultValue={c.campaign_start || ""}
          />
          <Field
            label="Campaign end"
            name="campaign_end"
            type="date"
            defaultValue={c.campaign_end || ""}
          />
        </div>
        <Field
          label="Target audience"
          name="target_audience"
          defaultValue={c.target_audience}
        />
        <Field label="Deliverables — one per line">
          <textarea
            name="deliverables"
            required
            defaultValue={
              c.deliverables?.join("\n") ||
              "1 × Instagram Reel\n2 × Instagram Stories"
            }
          />
        </Field>
        {error && <p className="notice">{error}</p>}
        <div className="actions">
          <button className="secondary" value="draft" disabled={busy}>
            Save draft
          </button>
          <button value="published" disabled={busy}>
            Publish campaign <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Discovery(ctx) {
  const {
    company,
    data,
    results,
    setResults,
    query,
    setQuery,
    onSearch,
    run,
    refresh,
  } = ctx;
  const [tab, setTab] = useState("Search"),
    [view, setView] = useState("grid"),
    [sort, setSort] = useState("engagement_rate");
  const [filters, setFilters] = useState(() => parseCriteria(query)),
    [selected, setSelected] = useState([]),
    [compare, setCompare] = useState(false);
  const list = (results?.creators || [])
    .slice()
    .sort((a, b) =>
      sort === "base_rate" ? (a.display_price ?? a.base_rate) - (b.display_price ?? b.base_rate) : b[sort] - a[sort],
    );
  return (
    <>
      <Heading
        label="IVRE AI"
        title="Find your next creative partner."
        text="Search real IVRE creator profiles by the requirements that matter."
      />
      <div className="tabs">
        {["Search", "Search history", "Saved searches"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Search" ? (
        <>
          <SearchBox
            {...ctx}
            initial={query}
            searches={data.searches}
            onSearch={(text) => {
              setFilters(parseCriteria(text));
              onSearch(text);
            }}
          />
          <form
            className="filter-panel"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(query || "Filtered creator search", filters);
            }}
          >
            <Field label="Niche">
              <select
                value={filters.niche || ""}
                onChange={(e) =>
                  setFilters({ ...filters, niche: e.target.value })
                }
              >
                <option value="">All niches</option>
                {niches.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
            {[
              ["Location", "location"],
              ["Minimum followers", "follower_min"],
              ["Maximum followers", "follower_max"],
              ["Engagement % ≥", "engagement_min"],
              ["Budget ₹ ≤", "budget_max"],
            ].map(([label, k]) => (
              <Field
                key={k}
                label={label}
                value={filters[k] ?? ""}
                type={k === "location" ? "text" : "number"}
                min="0"
                step="any"
                onChange={(e) =>
                  setFilters({ ...filters, [k]: e.target.value })
                }
              />
            ))}
            <button disabled={ctx.busy}>Apply filters</button>
          </form>
          {results && (
            <>
              <Heading
                label="YOUR RESULTS"
                title={`${results.total} creators found`}
                text={`${list.length} profiles shown · Matches satisfy your selected criteria. Sorted by ${sort.replaceAll("_", " ")}.`}
              >
                <div className="actions">
                  <select
                    aria-label="Sort creators"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="engagement_rate">Engagement</option>
                    <option value="follower_count">Followers</option>
                    <option value="base_rate">Price: low to high</option>
                  </select>
                  <button
                    className="icon"
                    aria-label="Grid view"
                    onClick={() => setView("grid")}
                  >
                    <Grid2X2 size={18} />
                  </button>
                  <button
                    className="icon"
                    aria-label="List view"
                    onClick={() => setView("list")}
                  >
                    <List size={18} />
                  </button>
                </div>
              </Heading>
              {selected.length > 0 && (
                <div className="selection-bar">
                  <span>{selected.length} selected</span>
                  <button onClick={() => setCompare(true)}>Compare</button>
                  <button
                    className="secondary"
                    onClick={() =>
                      run(async () => {
                        await checked(
                          db.from("company_creator_links").upsert(
                            selected.map((id) => ({
                              company_id: company.id,
                              creator_id: id,
                            })),
                            { onConflict: "company_id,creator_id" },
                          ),
                        );
                        await refresh();
                      })
                    }
                  >
                    Shortlist selected
                  </button>
                </div>
              )}
              <div
                className={view === "grid" ? "creator-grid" : "creator-list"}
              >
                {list.map((c) => (
                  <CreatorCard
                    key={c.id}
                    creator={c}
                    {...ctx}
                    select={
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.full_name}`}
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, c.id]
                              : selected.filter((id) => id !== c.id),
                          )
                        }
                      />
                    }
                  />
                ))}
              </div>
              {!list.length && (
                <Empty
                  title="No creators meet these requirements yet."
                  text="Try a wider location, follower range or budget. We only show creators who have registered on IVRE."
                />
              )}
              {results.total > list.length && (
                <div className="unlock">
                  <Lock />
                  <h3>
                    {results.total - list.length} more creators match your
                    requirements.
                  </h3>
                  <p>Unlock all {results.total} with a paid plan.</p>
                  <button onClick={() => ctx.navigate("Billing")}>
                    Explore plans <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="panel">
          {data.searches
            .filter((s) => tab !== "Saved searches" || s.saved)
            .map((s) => (
              <div className="history-row" key={s.id}>
                <div>
                  <strong>{s.prompt}</strong>
                  <small>
                    {s.result_count} matches · {date(s.created_at)}
                  </small>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    setResults({
                      id: s.id,
                      total: s.result_count,
                      creators: s.results,
                    });
                    setQuery(s.prompt);
                    setFilters(s.filters);
                    setTab("Search");
                  }}
                >
                  View results
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    onSearch(s.prompt, s.filters);
                    setTab("Search");
                  }}
                >
                  Run again
                </button>
                <button
                  className="icon"
                  aria-label={s.saved ? "Unsave search" : "Save search"}
                  onClick={() =>
                    run(async () => {
                      await checked(
                        db
                          .from("company_searches")
                          .update({ saved: !s.saved })
                          .eq("id", s.id),
                      );
                      await refresh();
                    })
                  }
                >
                  <Bookmark
                    fill={s.saved ? "currentColor" : "none"}
                    size={18}
                  />
                </button>
              </div>
            ))}
          {!data.searches.length && (
            <Empty
              title="Your search history starts here."
              text="Search for creators to save and rerun your criteria."
            />
          )}
        </div>
      )}
      {compare && (
        <Modal title="Compare creators" onClose={() => setCompare(false)}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Followers</th>
                  <th>Engagement</th>
                  <th>Location</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {list
                  .filter((c) => selected.includes(c.id))
                  .map((c) => (
                    <tr key={c.id}>
                      <td>{c.full_name}</td>
                      <td>{count(c.follower_count)}</td>
                      <td>{c.engagement_rate}%</td>
                      <td>{c.location}</td>
                      <td>{money(c.display_price ?? c.base_rate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}

function CreatorCard({ creator: c, company, data, run, refresh, select }) {
  const [open, setOpen] = useState(false),
    [invite, setInvite] = useState(false);
  const link = data.links.find((l) => l.creator_id === c.id);
  const save = (relationship) =>
    run(async () => {
      await checked(
        db
          .from("company_creator_links")
          .upsert(
            { company_id: company.id, creator_id: c.id, relationship },
            { onConflict: "company_id,creator_id" },
          ),
      );
      await refresh();
    });
  return (
    <article className="creator-card">
      <div className="creator-top">
        <div className="avatar big">{initials(c.full_name)}</div>
        {select}
        <Tag>{c.availability || "available"}</Tag>
      </div>
      <h3>{c.full_name}</h3>
      <p>
        {c.instagram_handle || "Creator"} ·{" "}
        {c.location || "Location not provided"}
      </p>
      <div className="chips">
        {(c.niches || []).map((n) => (
          <Tag key={n}>{n}</Tag>
        ))}
      </div>
      <div className="mini-stats">
        <span>
          <strong>{count(c.follower_count)}</strong>followers
        </span>
        <span>
          <strong>{c.engagement_rate}%</strong>engagement
        </span>
        <span>
          <strong>{money(c.display_price ?? c.base_rate)}</strong>{c.display_price != null ? "package from" : "base rate"}
        </span>
      </div>
      <div className="actions">
        <button className="secondary" onClick={() => { location.href = `?page=Marketplace&creator=${encodeURIComponent(c.id)}`; }}>
          View profile
        </button>
        <button onClick={() => save("shortlisted")}>
          {link ? "Saved" : "Shortlist"}
        </button>
        <button
          className="icon"
          aria-label="Invite to campaign"
          onClick={() => setInvite(true)}
        >
          <Plus size={17} />
        </button>
      </div>
      {open && (
        <Modal title={c.full_name} onClose={() => setOpen(false)}>
          <p>{c.bio || "This creator has not added a bio yet."}</p>
          <Stats
            items={[
              ["Followers", count(c.follower_count)],
              ["Engagement", `${c.engagement_rate}%`],
              ["Base rate", money(c.base_rate)],
              ["Completed campaigns", c.completed_campaigns || 0],
            ]}
          />
          <p>
            Audience locations:{" "}
            {(c.audience_locations || []).join(", ") || "Not provided"}
          </p>
          <p>
            Content formats:{" "}
            {(c.content_formats || []).join(", ") || "Not provided"}
          </p>
          {c.portfolio_url && /^https?:\/\//.test(c.portfolio_url) && (
            <a target="_blank" rel="noreferrer" href={c.portfolio_url}>
              View portfolio ↗
            </a>
          )}
          <div className="actions">
            <button onClick={() => save("preferred")}>
              <Star size={16} />
              Mark preferred
            </button>
            <button className="secondary" onClick={() => save("blocked")}>
              Do not recommend
            </button>
            <button onClick={() => setInvite(true)}>Invite to campaign</button>
          </div>
          <p className="fine">
            Audience and performance figures are supplied by the creator. No
            verification is implied.
          </p>
        </Modal>
      )}
      {invite && (
        <Modal title={`Invite ${c.full_name}`} onClose={() => setInvite(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e.currentTarget);
              run(async () => {
                await checked(
                  db
                    .from("campaign_invitations")
                    .insert({ ...f, creator_id: c.id, invited_by: null }),
                );
                await refresh();
                setInvite(false);
              });
            }}
          >
            <Field label="Campaign">
              <select required name="campaign_id">
                <option value="">Choose a published campaign</option>
                {data.campaigns
                  .filter((p) => p.status === "published")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Invitation message">
              <textarea
                name="message"
                required
                placeholder="Tell the creator why they would be a good fit…"
              />
            </Field>
            <button>
              Send invitation <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
    </article>
  );
}
function CreatorLibrary(ctx) {
  const [filter, setFilter] = useState("All");
  const known = new Map();
  ctx.data.searches.forEach((s) =>
    (s.results || []).forEach((c) => known.set(c.id, c)),
  );
  ctx.data.apps.forEach((a) => {
    if (a.creator_profiles) known.set(a.creator_id, a.creator_profiles);
  });
  const links = ctx.data.links.filter(
    (l) => filter === "All" || l.relationship === filter,
  );
  return (
    <>
      <Heading
        label="YOUR CREATOR NETWORK"
        title="Keep the right people close."
      />
      <div className="tabs">
        {["All", "preferred", "shortlisted", "worked_with", "blocked"].map(
          (t) => (
            <button
              key={t}
              className={t === filter ? "selected" : ""}
              onClick={() => setFilter(t)}
            >
              {t.replaceAll("_", " ")}
            </button>
          ),
        )}
      </div>
      <div className="creator-grid">
        {links.map(
          (l) =>
            known.has(l.creator_id) && (
              <CreatorCard
                key={l.creator_id}
                creator={known.get(l.creator_id)}
                {...ctx}
              />
            ),
        )}
      </div>
      {!links.length && (
        <Empty
          title="Build your creator network."
          text="Search and shortlist creators to find them here."
          action={
            <button onClick={() => ctx.navigate("IVRE AI")}>
              Find creators
            </button>
          }
        />
      )}
    </>
  );
}
function Shortlists(ctx) {
  const { company, data, run, refresh } = ctx;
  const [chosen, setChosen] = useState(null);
  return (
    <>
      <Heading
        label="YOUR CREATOR LIBRARY"
        title="A place for every shortlist."
      />
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          run(async () => {
            await checked(
              db
                .from("company_shortlists")
                .insert({ company_id: company.id, name: formData(form).name }),
            );
            form.reset();
            await refresh();
          });
        }}
      >
        <input
          name="name"
          required
          placeholder="New shortlist name"
          aria-label="Shortlist name"
        />
        <button>
          <Plus size={17} />
          Create shortlist
        </button>
      </form>
      <div className="campaign-grid">
        {data.shortlists.map((s) => (
          <button
            className="panel shortlist"
            key={s.id}
            onClick={() => setChosen(s)}
          >
            <Bookmark />
            <h3>{s.name}</h3>
            <p>
              {data.links.filter((l) => l.shortlist_id === s.id).length}{" "}
              creators
            </p>
            <ArrowUpRight />
          </button>
        ))}
      </div>
      <Heading title="Saved creators" />
      <CreatorLibrary {...ctx} />
      {chosen && (
        <Modal title={chosen.name} onClose={() => setChosen(null)}>
          <p>Select saved creators to include.</p>
          {data.links.map((l) => {
            const c =
              data.searches
                .flatMap((s) => s.results)
                .find((c) => c.id === l.creator_id) ||
              data.apps.find((a) => a.creator_id === l.creator_id)
                ?.creator_profiles;
            return (
              <label className="row" key={l.creator_id}>
                <input
                  type="checkbox"
                  checked={l.shortlist_id === chosen.id}
                  onChange={(e) =>
                    run(async () => {
                      await checked(
                        db
                          .from("company_creator_links")
                          .update({
                            shortlist_id: e.target.checked ? chosen.id : null,
                          })
                          .eq("company_id", company.id)
                          .eq("creator_id", l.creator_id),
                      );
                      await refresh();
                    })
                  }
                />
                {c?.full_name || "Saved creator"}
              </label>
            );
          })}
        </Modal>
      )}
    </>
  );
}

function CampaignDetail(ctx) {
  const { campaign: c, data, onBack, onEdit, run, refresh, busy } = ctx;
  const [tab, setTab] = useState("Overview"),
    [status, setStatus] = useState("All"),
    [selected, setSelected] = useState([]),
    [review, setReview] = useState(null);
  if (!c) return null;
  const apps = data.apps.filter((a) => a.campaign_id === c.id),
    content = data.content.filter((i) =>
      apps.some((a) => a.id === i.application_id),
    );
  const filtered = apps.filter(
    (a) => status === "All" || a.status === status || a.lifecycle === status,
  );
  return (
    <>
      <button className="text-button" onClick={onBack}>
        ← All campaigns
      </button>
      <Heading
        label={`${c.campaign_code} · ${c.visibility.toUpperCase()} CAMPAIGN`}
        title={c.name}
        text={`${c.brand_name} · ${c.niche} · ${c.location}`}
      >
        <div className="actions">
          <Tag>{c.status}</Tag>
          <button className="secondary" onClick={() => onEdit(c)}>
            Edit brief
          </button>
          {c.status === "published" && (
            <button
              className="secondary"
              onClick={() =>
                run(async () => {
                  await checked(
                    db
                      .from("campaigns")
                      .update({ status: "closed" })
                      .eq("id", c.id),
                  );
                  await refresh();
                })
              }
            >
              Close campaign
            </button>
          )}
        </div>
      </Heading>
      <div className="tabs">
        {[
          "Overview",
          "Creators",
          "Applications",
          "Content",
          "Messages",
          "Payments",
          "Analytics",
        ].map((t) => (
          <button
            className={tab === t ? "selected" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <>
          <Stats
            items={[
              ["Budget", money(c.total_budget)],
              [
                "Creators",
                `${apps.filter((a) => a.status === "accepted").length} / ${c.required_creators}`,
              ],
              ["Applications", apps.length],
              ["End date", date(c.campaign_end)],
            ]}
          />
          <div className="stage-grid">
            {[
              [
                "Creators",
                apps.filter((a) => ["accepted", "completed"].includes(a.status))
                  .length,
              ],
              ["Content", new Set(content.map((i) => i.application_id)).size],
              [
                "Approval",
                new Set(
                  content
                    .filter((i) => ["approved", "published"].includes(i.status))
                    .map((i) => i.application_id),
                ).size,
              ],
              [
                "Published",
                new Set(
                  content
                    .filter((i) => i.status === "published")
                    .map((i) => i.application_id),
                ).size,
              ],
              [
                "Paid",
                apps.filter((a) => paymentTotals(a, data.payments).settled)
                  .length,
              ],
            ].map(([s, n]) => (
              <button
                key={s}
                className="panel"
                onClick={() =>
                  setTab(
                    s === "Creators"
                      ? "Creators"
                      : s === "Paid"
                        ? "Payments"
                        : "Content",
                  )
                }
              >
                <small>{s}</small>
                <strong>
                  {n}/{c.required_creators}
                </strong>
                <div className="progress">
                  <i style={{ width: `${(n / c.required_creators) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
          <div className="two-col">
            <section className="panel">
              <h3>The brief</h3>
              <p className="preserve">{c.description}</p>
              <h4>Deliverables</h4>
              {c.deliverables.map((d) => (
                <p key={d}>✓ {d}</p>
              ))}
              <p>{c.target_audience}</p>
              <p>
                {date(c.campaign_start)} — {date(c.campaign_end)}
              </p>
            </section>
            <Activity
              items={data.activity
                .filter((a) => a.campaign_id === c.id)
                .slice(0, 8)}
            />
          </div>
        </>
      )}
      {(tab === "Creators" || tab === "Applications") && (
        <>
          <div className="toolbar">
            <select
              aria-label="Filter creator status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "All",
                "submitted",
                "shortlisted",
                "accepted",
                "rejected",
                ...stages.filter((s) => s !== "submitted"),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              className="secondary"
              onClick={() =>
                exportCSV(
                  c.campaign_code,
                  filtered.map((a) => ({
                    creator: a.creator_profiles?.full_name,
                    status: a.status,
                    stage: a.lifecycle,
                    deadline: a.content_deadline,
                    quote: a.proposed_price,
                    match: a.match_score,
                  })),
                )
              }
            >
              <Download size={16} />
              Export
            </button>
          </div>
          {selected.length > 0 && (
            <form
              className="selection-bar"
              onSubmit={(e) => {
                e.preventDefault();
                const deadline = formData(e.currentTarget).deadline;
                run(async () => {
                  for (const id of selected) {
                    const a = apps.find((a) => a.id === id);
                    await checked(
                      db.rpc("review_company_application", {
                        aid: id,
                        decision: a.status,
                        note: a.brand_note,
                        deadline,
                        stage: a.lifecycle,
                      }),
                    );
                  }
                  await refresh();
                  setSelected([]);
                });
              }}
            >
              <span>{selected.length} selected</span>
              <input
                type="date"
                name="deadline"
                required
                aria-label="Bulk deadline"
              />
              <button disabled={busy}>Change deadline</button>
            </form>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Creator</th>
                  <th>Match</th>
                  <th>Deliverables</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Quote</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${a.creator_profiles?.full_name}`}
                        checked={selected.includes(a.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, a.id]
                              : selected.filter((id) => id !== a.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <strong>{a.creator_profiles?.full_name}</strong>
                      <small>{a.creator_profiles?.instagram_handle}</small>
                    </td>
                    <td>{a.match_score}%</td>
                    <td>{c.deliverables.join(" + ")}</td>
                    <td>
                      <Tag>{a.status}</Tag>
                      <small>{a.lifecycle.replaceAll("_", " ")}</small>
                    </td>
                    <td
                      className={
                        a.content_deadline <
                        new Date().toISOString().slice(0, 10)
                          ? "overdue"
                          : ""
                      }
                    >
                      {date(a.content_deadline)}
                    </td>
                    <td>{money(a.agreed_amount ?? a.proposed_price)}</td>
                    <td>
                      <button
                        className="secondary"
                        onClick={() => setReview(a)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!apps.length && (
            <Empty
              title="Applications will arrive here."
              text="Creators can discover and apply to your published open campaign."
            />
          )}
          {tab === "Creators" && (
            <section className="panel">
              <h3>Invitations</h3>
              {data.invites
                .filter((i) => i.campaign_id === c.id)
                .map((i) => (
                  <div className="row" key={i.id}>
                    <span>Creator invitation · {date(i.created_at)}</span>
                    <Tag>{i.status}</Tag>
                  </div>
                ))}
            </section>
          )}
        </>
      )}
      {tab === "Content" && <ContentReview {...ctx} items={content} />}
      {tab === "Messages" && <Messages {...ctx} campaignId={c.id} />}
      {tab === "Payments" && <Payments {...ctx} campaignId={c.id} />}
      {tab === "Analytics" && <Analytics {...ctx} campaignId={c.id} />}
      {review && (
        <Modal
          title={`Review ${review.creator_profiles?.full_name || "application"}`}
          onClose={() => setReview(null)}
        >
          <p>
            <b>Why they're a fit</b>
          </p>
          <p className="preserve">{review.why_fit}</p>
          <p>
            <b>Content idea</b>
          </p>
          <p className="preserve">{review.content_idea}</p>
          <div className="chips">
            {Object.entries(review.match_breakdown || {}).map(([k, v]) => (
              <Tag key={k}>{`${k}: ${v}%`}</Tag>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e.currentTarget);
              run(async () => {
                await checked(
                  db.rpc("review_company_application", {
                    aid: review.id,
                    decision: f.decision,
                    note: f.note || null,
                    amount: f.amount ? Number(f.amount) : null,
                    deadline: f.deadline || null,
                    stage:
                      f.decision === "accepted" && f.stage === "applied"
                        ? "confirmed"
                        : f.stage || null,
                  }),
                );
                await refresh();
                setReview(null);
              });
            }}
          >
            <div className="form-grid">
              <Field label="Decision">
                <select name="decision" defaultValue={review.status}>
                  {[
                    "submitted",
                    "shortlisted",
                    "accepted",
                    "rejected",
                    "completed",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Delivery stage">
                <select name="stage" defaultValue={review.lifecycle}>
                  {stages
                    .filter((s) => s !== "paid")
                    .map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                </select>
              </Field>
              <Field
                label="Agreed rate ₹"
                name="amount"
                type="number"
                min="0"
                defaultValue={review.agreed_amount ?? review.proposed_price}
              />
              <Field
                label="Content deadline"
                name="deadline"
                type="date"
                defaultValue={review.content_deadline || ""}
              />
            </div>
            <Field label="Note to creator">
              <textarea name="note" defaultValue={review.brand_note || ""} />
            </Field>
            <button disabled={busy}>Save decision</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function ContentReview({ items, data, run, refresh, busy }) {
  const [review, setReview] = useState(null);
  const [status, setStatus] = useState("all");
  const filtered = contentMatches(items, status);
  return (
    <>
      <Heading
        label="CONTENT STUDIO"
        title="Great work deserves clear feedback."
      />
      <div className="toolbar">
        <Field label="Filter content">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {[
              ["all", "All content"],
              ["submitted", "Awaiting review"],
              ["revision", "Revision required"],
              ["approved", "Approved"],
              ["published", "Published"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({contentMatches(items, value).length})
              </option>
            ))}
          </select>
        </Field>
        <span>{filtered.length} submissions</span>
      </div>
      <div className="creator-grid">
        {filtered.map((i) => (
          <article className="panel" key={i.id}>
            <Tag>{i.status}</Tag>
            <h3>{i.title}</h3>
            <p>
              {
                data.apps.find((a) => a.id === i.application_id)
                  ?.creator_profiles?.full_name
              }
            </p>
            <a href={i.content_url} target="_blank" rel="noreferrer">
              View submission ↗
            </a>
            {i.post_url && (
              <p>
                <a href={i.post_url} target="_blank" rel="noreferrer">
                  View published post ↗
                </a>
              </p>
            )}
            <small>Submitted {date(i.created_at)}</small>
            {i.review_note && <p>{i.review_note}</p>}
            {i.status !== "published" && (
              <div className="actions">
                <button
                  disabled={busy || i.status === "approved"}
                  onClick={() =>
                    run(async () => {
                      await checked(
                        db.rpc("review_campaign_content", {
                          content_id: i.id,
                          decision: "approved",
                        }),
                      );
                      await refresh();
                    })
                  }
                >
                  <Check size={15} />
                  Approve
                </button>
                <button
                  disabled={busy}
                  className="secondary"
                  onClick={() => setReview(i)}
                >
                  Request changes
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title={
            items.length
              ? "No content in this stage."
              : "Content submissions will appear here."
          }
          text="Accepted creators can submit content links from their Active campaigns page."
        />
      )}
      {review && (
        <Modal title="Request changes" onClose={() => setReview(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const note = formData(e.currentTarget).note;
              run(async () => {
                await checked(
                  db.rpc("review_campaign_content", {
                    content_id: review.id,
                    decision: "revision",
                    note,
                  }),
                );
                await refresh();
                setReview(null);
              });
            }}
          >
            <Field label="What should the creator change?">
              <textarea name="note" required />
            </Field>
            <button>Send revision request</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Messages({ data, session, run, company, campaignId }) {
  const conversations = data.apps.filter(
    (a) => !campaignId || a.campaign_id === campaignId,
  );
  const [selected, setSelected] = useState(conversations[0]?.id || ""),
    [messages, setMessages] = useState([]);
  const app = conversations.find((a) => a.id === selected);
  const fetchMessages = useCallback(async () => {
    if (app)
      setMessages(
        await checked(
          db
            .from("campaign_messages")
            .select("*")
            .eq("application_id", app.id)
            .order("created_at"),
        ),
      );
  }, [app?.id]);
  useEffect(() => {
    fetchMessages().catch(() => {});
    const timer = setInterval(() => fetchMessages().catch(() => {}), 8000);
    return () => clearInterval(timer);
  }, [fetchMessages]);
  return (
    <>
      <Heading
        label="CAMPAIGN CONVERSATIONS"
        title="Keep the collaboration moving."
      />
      {!conversations.length ? (
        <Empty
          title="No conversations yet."
          text="When a creator applies to a campaign, their conversation opens here."
        />
      ) : (
        <div className="messenger">
          <aside>
            {conversations.map((a) => (
              <button
                key={a.id}
                className={a.id === selected ? "selected" : ""}
                onClick={() => setSelected(a.id)}
              >
                <div className="avatar pale">
                  {initials(a.creator_profiles?.full_name)}
                </div>
                <span>
                  {a.creator_profiles?.full_name}
                  <small>
                    {data.campaigns.find((c) => c.id === a.campaign_id)?.name}
                  </small>
                </span>
              </button>
            ))}
          </aside>
          <div className="conversation">
            <div className="thread">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "bubble " + (m.sender_id === session.user.id ? "own" : "")
                  }
                >
                  <p>{m.body}</p>
                  <small>{date(m.created_at)}</small>
                </div>
              ))}
              {!messages.length && (
                <p className="muted">
                  Start the conversation with{" "}
                  {app?.creator_profiles?.full_name || "a creator"}.
                </p>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget,
                  body = formData(f).body;
                run(async () => {
                  await checked(
                    db.from("campaign_messages").insert({
                      campaign_id: app.campaign_id,
                      application_id: app.id,
                      sender_id: session.user.id,
                      recipient_id: app.creator_id,
                      body,
                    }),
                  );
                  f.reset();
                  await fetchMessages();
                });
              }}
            >
              <textarea
                name="body"
                required
                maxLength={4000}
                aria-label="Message to creator"
                placeholder="Write a message…"
              />
              <button disabled={!app}>
                Send <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Payments({ company, data, campaignId, run, refresh, busy, role }) {
  const [adding, setAdding] = useState(false);
  const [settling, setSettling] = useState(null);
  const canRecord = ["owner", "admin", "finance"].includes(role);
  const apps = data.apps.filter(
    (a) =>
      (!campaignId || a.campaign_id === campaignId) &&
      ["accepted", "completed"].includes(a.status),
  );
  const payments = data.payments.filter(
    (p) => !campaignId || apps.some((a) => a.id === p.application_id),
  );
  const sum = (st) =>
    payments
      .filter((p) => !st || p.status === st)
      .reduce((s, p) => s + Number(p.amount), 0);
  const totals = apps.map((a) => paymentTotals(a, payments));
  return (
    <>
      <Heading
        label="PAYMENT LEDGER"
        title="Know where every rupee goes."
        text="Track creator payments and invoices. Recording a payment does not transfer funds."
      >
        {canRecord && (
          <button onClick={() => setAdding(true)}>
            <Plus size={16} />
            Record payment
          </button>
        )}
      </Heading>
      <Stats
        items={[
          ["Agreed fees", money(totals.reduce((n, t) => n + t.committed, 0))],
          ["Paid", money(sum("paid"))],
          [
            "Outstanding fees",
            money(totals.reduce((n, t) => n + t.outstanding, 0)),
          ],
          ["Pending records", money(sum("pending"))],
        ]}
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Creator</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Invoice</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>
                  {
                    data.apps.find((a) => a.id === p.application_id)
                      ?.creator_profiles?.full_name
                  }
                </td>
                <td>{money(p.amount)}</td>
                <td>
                  <Tag>{p.status}</Tag>
                </td>
                <td>{p.reference || "—"}</td>
                <td>{date(p.paid_at || p.created_at)}</td>
                <td>
                  {p.invoice_url && /^https:\/\//.test(p.invoice_url) ? (
                    <a href={p.invoice_url} target="_blank" rel="noreferrer">
                      Open ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {canRecord && p.status === "pending" && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setSettling(p)}
                    >
                      Mark paid externally
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!payments.length && (
        <Empty
          title="No payments recorded."
          text="Accept a creator application to begin tracking payment records."
        />
      )}
      {settling && (
        <Modal
          title="Confirm external payment record"
          onClose={() => setSettling(null)}
        >
          <p>
            Only record this after {money(settling.amount)} has been paid
            outside IVRE. This action does not send money. Saved paid records
            cannot be edited here.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fields = formData(e.currentTarget);
              run(async () => {
                await checked(
                  db
                    .from("company_payments")
                    .update({
                      status: "paid",
                      reference: fields.reference.trim(),
                      invoice_url: fields.invoice_url || null,
                    })
                    .eq("id", settling.id)
                    .eq("company_id", company.id)
                    .eq("status", "pending")
                    .select("id")
                    .single(),
                );
                await refresh();
                setSettling(null);
              });
            }}
          >
            <Field
              label="External transaction reference"
              name="reference"
              required
              defaultValue={settling.reference || ""}
            />
            <Field
              label="Invoice URL"
              name="invoice_url"
              type="url"
              pattern="https://.*"
              defaultValue={settling.invoice_url || ""}
            />
            <button disabled={busy}>Confirm paid record</button>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal
          title="Record a creator payment"
          onClose={() => setAdding(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e.currentTarget);
              run(async () => {
                await checked(
                  db.from("company_payments").insert({
                    ...f,
                    company_id: company.id,
                    amount: Number(f.amount),
                    paid_at:
                      f.status === "paid" ? new Date().toISOString() : null,
                    invoice_url: f.invoice_url || null,
                  }),
                );
                await refresh();
                setAdding(false);
              });
            }}
          >
            <Field label="Creator / campaign">
              <select name="application_id" required>
                <option value="">Select accepted collaboration</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.creator_profiles?.full_name} —{" "}
                    {data.campaigns.find((c) => c.id === a.campaign_id)?.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Amount ₹"
              name="amount"
              type="number"
              min="1"
              required
            />
            <Field label="Status">
              <select name="status">
                <option value="pending">Pending</option>
                <option value="paid">Paid externally</option>
              </select>
            </Field>
            <Field
              label="Payment reference"
              name="reference"
              placeholder="Bank / payment transaction reference"
              required
            />
            <Field
              label="Invoice URL"
              name="invoice_url"
              type="url"
              pattern="https://.*"
            />
            <button disabled={busy}>Save payment record</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Analytics({ data, campaignId, run, refresh }) {
  const apps = data.apps.filter(
      (a) => !campaignId || a.campaign_id === campaignId,
    ),
    items = data.content.filter((c) =>
      apps.some((a) => a.id === c.application_id),
    );
  const [editing, setEditing] = useState(null);
  const sum = (k) => items.reduce((s, i) => s + Number(i[k]), 0);
  return (
    <>
      <Heading
        label="MEASURE THE IMPACT"
        title="Your campaign performance."
        text="Metrics entered from creator reports. Add actual post performance to build your analytics."
      />
      <Stats
        items={[
          ["Reach", count(sum("reach"))],
          ["Impressions", count(sum("impressions"))],
          ["Views", count(sum("views"))],
          [
            "Engagement",
            sum("impressions")
              ? ((sum("engagements") / sum("impressions")) * 100).toFixed(2) +
                "%"
              : "—",
          ],
        ]}
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Content</th>
              <th>Creator</th>
              <th>Reach</th>
              <th>Views</th>
              <th>Engagements</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td>
                  {
                    apps.find((a) => a.id === i.application_id)
                      ?.creator_profiles?.full_name
                  }
                </td>
                <td>{count(i.reach)}</td>
                <td>{count(i.views)}</td>
                <td>{count(i.engagements)}</td>
                <td>
                  <button className="secondary" onClick={() => setEditing(i)}>
                    Update metrics
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!items.length && (
        <Empty
          title="Performance starts with published work."
          text="Content metrics and creator comparisons will appear as reports are added."
        />
      )}
      {editing && (
        <Modal title="Update content metrics" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = formData(e.currentTarget);
              run(async () => {
                await checked(
                  db
                    .from("campaign_content")
                    .update(
                      Object.fromEntries(
                        Object.entries(f).map(([k, v]) => [k, Number(v)]),
                      ),
                    )
                    .eq("id", editing.id),
                );
                await refresh();
                setEditing(null);
              });
            }}
          >
            <div className="form-grid">
              {["reach", "impressions", "views", "engagements"].map((k) => (
                <Field
                  key={k}
                  label={k}
                  name={k}
                  type="number"
                  min="0"
                  required
                  defaultValue={editing[k]}
                />
              ))}
            </div>
            <button>Save metrics</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Team({ data, company, run, refresh, session }) {
  return (
    <>
      <Heading
        label="BETTER TOGETHER"
        title="Your company team."
        text="Invited teammates join by signing in here with the exact invited email address."
      />
      <div className="panel">
        <h3>Workspace members</h3>
        {data.members.map((m) => (
          <div className="row" key={m.user_id}>
            <span>
              {m.user_id === session.user.id
                ? session.user.email
                : `Member ${m.user_id.slice(0, 8)}`}
            </span>
            <Tag>{m.role}</Tag>
          </div>
        ))}
      </div>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          run(async () => {
            await checked(
              db
                .from("company_team_invites")
                .upsert(
                  { ...formData(form), company_id: company.id },
                  { onConflict: "company_id,email" },
                ),
            );
            form.reset();
            await refresh();
          });
        }}
      >
        <h3>Invite a teammate</h3>
        <div className="form-grid">
          <Field label="Email" name="email" type="email" required />
          <Field label="Role">
            <select name="role">
              {[
                "admin",
                "campaign_manager",
                "marketing",
                "finance",
                "viewer",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="fine">
          Creates an invitation in IVRE. Share this portal URL with your
          teammate so they can join.
        </p>
        <button>
          Add invitation <Plus size={16} />
        </button>
      </form>
      <div className="panel">
        <h3>Pending invitations</h3>
        {data.teamInvites.map((i) => (
          <div className="row" key={i.id}>
            <span>{i.email}</span>
            <Tag>{i.role}</Tag>
            <button
              className="secondary"
              onClick={() =>
                run(async () => {
                  await checked(
                    db.from("company_team_invites").delete().eq("id", i.id),
                  );
                  await refresh();
                })
              }
            >
              Revoke
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
function CompanyProfile({ company, data, run, refresh, busy }) {
  return (
    <>
      <Heading
        label="YOUR BRAND, UNDERSTOOD"
        title="Tell your story."
        text="Your company and brand details give every campaign a stronger starting point."
      />
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const f = formData(e.currentTarget);
          run(async () => {
            await checked(
              db.from("company_profiles").update(f).eq("id", company.id),
            );
            await refresh();
          });
        }}
      >
        <h3>Company information</h3>
        <div className="form-grid">
          {[
            ["Company name", "company_name"],
            ["Website", "website"],
            ["Industry", "industry"],
            ["Country", "country"],
            ["City", "city"],
            ["Company size", "company_size"],
            ["Phone", "phone"],
            ["Logo URL", "logo_url"],
          ].map(([label, key]) => (
            <Field
              key={key}
              label={label}
              name={key}
              defaultValue={company[key] || ""}
              required={key === "company_name"}
            />
          ))}
        </div>
        <h3>Brand profile</h3>
        {[
          ["Brand description", "brand_description"],
          ["Products / services", "products"],
          ["Target audience", "target_audience"],
          ["Target locations", "target_locations"],
          ["Brand tone", "brand_tone"],
          ["Brand values", "brand_values"],
          ["Competitors", "competitors"],
        ].map(([label, key]) => (
          <Field key={key} label={label}>
            <textarea name={key} defaultValue={company[key] || ""} />
          </Field>
        ))}
        <button disabled={busy}>Save company profile</button>
      </form>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          run(async () => {
            await checked(
              db
                .from("company_assets")
                .insert({ ...formData(form), company_id: company.id }),
            );
            form.reset();
            await refresh();
          });
        }}
      >
        <h3>Brand asset library</h3>
        <p>Link to your guidelines, product photos, videos or brand deck.</p>
        <div className="form-grid">
          <Field label="Asset name" name="name" required />
          <Field
            label="Secure asset URL"
            name="url"
            type="url"
            pattern="https://.*"
            required
          />
        </div>
        <button>Add asset</button>
        {data.assets.map((a) => (
          <div className="row" key={a.id}>
            <a href={a.url} target="_blank" rel="noreferrer">
              {a.name} ↗
            </a>
          </div>
        ))}
      </form>
    </>
  );
}
function Billing({ company, data, run, setNotice }) {
  const plans = [
    ["basic", "AI Basic", "₹299 / month"],
    ["elevate", "Elevate", "₹499 / month"],
    ["pro", "Pro", "₹999 / month"],
    ["private", "Private", "Custom"],
  ];
  return (
    <>
      <Heading label="ROOM TO GROW" title="Your plan. Your pace." />
      <Stats
        items={[
          ["Current plan", company.plan.toUpperCase()],
          ["Campaigns", `${data.campaigns.length} / ${company.campaign_limit}`],
          ["Search allowance", company.search_limit],
          [
            "Creator access",
            "Published profiles",
          ],
        ]}
      />
      <div className="plan-grid">
        {plans.map(([id, title, price]) => (
          <article className="panel" key={id}>
            <small>IVRE</small>
            <h3>{title}</h3>
            <h2>{price}</h2>
            {id !== "private" && <p>18% GST additional. Total: {new Intl.NumberFormat("en-IN", {style: "currency", currency: "INR", minimumFractionDigits: 2}).format(({basic: 299, elevate: 499, pro: 999}[id]) * 1.18)} / month.</p>}
            <p>{({basic:10,elevate:30,pro:100})[id] || "Custom"} searches per month</p>
            <p>Login unlocks creator profiles. A subscription is required only for additional searches.</p>
            <button
              onClick={() =>
                run(async () => {
                  await checked(
                    db.from("company_upgrade_requests").upsert(
                      { company_id: company.id, requested_plan: id },
                      {
                        onConflict: "company_id,requested_plan",
                        ignoreDuplicates: true,
                      },
                    ),
                  );
                  setNotice(
                    "Upgrade request saved. Contact hello@ivre.marketing to arrange billing and activation.",
                  );
                })
              }
            >
              Request upgrade <ArrowUpRight size={16} />
            </button>
          </article>
        ))}
      </div>
      <p className="fine">
        An upgrade request does not charge your account. Creator fees are
        separate from your subscription.
      </p>
    </>
  );
}
function AccountSettings({ session, run, setNotice }) {
  const [preferences, setPreferences] = useState({
    campaign_notifications: true,
    message_notifications: true,
    payment_notifications: true,
  });
  useEffect(() => {
    checked(
      db
        .from("company_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    )
      .then((p) => p && setPreferences(p))
      .catch(() => {});
  }, [session.user.id]);
  return (
    <>
      <Heading label="ACCOUNT SETTINGS" title="Make this workspace yours." />
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          const f = formData(e.currentTarget);
          run(async () => {
            await checked(db.auth.updateUser({ password: f.password }));
            setNotice("Password updated.");
            e.target.reset();
          });
        }}
      >
        <h3>Account security</h3>
        <p>{session.user.email}</p>
        <Field
          label="New password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
        <button>Update password</button>
      </form>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await checked(
              db
                .from("company_preferences")
                .upsert({ ...preferences, user_id: session.user.id }),
            );
            setNotice("Notification preferences saved.");
          });
        }}
      >
        <h3>Notification preferences</h3>
        {[
          "campaign_notifications",
          "message_notifications",
          "payment_notifications",
        ].map((k) => (
          <label className="row" key={k}>
            <input
              type="checkbox"
              checked={preferences[k]}
              onChange={(e) =>
                setPreferences({ ...preferences, [k]: e.target.checked })
              }
            />
            {k.replaceAll("_", " ")}
          </label>
        ))}
        <button>Save preferences</button>
      </form>
    </>
  );
}
function Creative({ company, data, session, run }) {
  const [campaignId, setCampaignId] = useState(""),
    [output, setOutput] = useState("");
  return (
    <>
      <Heading
        label="IVRE CREATIVE AI"
        title="Give your next idea a head start."
        text="Choose a campaign to include its brief, deliverables and brand context."
      />
      <form
        className="panel creative-form"
        onSubmit={(e) => {
          e.preventDefault();
          const prompt = formData(e.currentTarget).prompt;
          run(async () => {
            const response = await fetch("/api/creative", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                company_id: company.id,
                campaign_id: campaignId || null,
                prompt,
              }),
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(result.error || "Creative AI is unavailable");
            setOutput(result.text);
          });
        }}
      >
        <Field label="Campaign context">
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">Company brand profile</option>
            {data.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What do you need?">
          <textarea
            name="prompt"
            required
            placeholder="Give me 3 Reel concepts with hooks, a shot list and a clear call to action."
          />
        </Field>
        <button>
          <Sparkles size={17} />
          Generate ideas
        </button>
      </form>
      {output && <article className="panel preserve">{output}</article>}
    </>
  );
}
