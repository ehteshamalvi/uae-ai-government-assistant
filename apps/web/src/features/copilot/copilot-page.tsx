import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';
import {
  useCreateCopilotSession,
  useCopilotSession,
  useSendCopilotMessage,
} from '@/hooks/use-copilot';
import type { CopilotMessageResponse } from '@/services/copilot-api';

const prompts = [
  { icon: 'fact_check', label: 'What is missing?' },
  { icon: 'description', label: 'Are my documents ready?' },
  { icon: 'info', label: 'What happens next?' },
  { icon: 'monitoring', label: 'Why is my readiness score what it is?' },
];

type ChatRow = {
  id: string;
  role: string;
  content: string;
  meta?: CopilotMessageResponse['assistantMessage'];
};

export function CopilotPage() {
  const [params] = useSearchParams();
  const transactionId = params.get('transactionId') ?? undefined;
  const documentId = params.get('documentId') ?? undefined;
  const draft = params.get('draft') ?? '';

  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState(draft);
  const [localRows, setLocalRows] = useState<ChatRow[]>([]);
  const createSession = useCreateCopilotSession();
  const sessionQuery = useCopilotSession(sessionId);
  const send = useSendCopilotMessage(sessionId);

  useEffect(() => {
    let cancelled = false;
    void createSession
      .mutateAsync({
        transactionId,
        title: transactionId ? 'Transaction Copilot' : 'General Copilot',
      })
      .then((s) => {
        if (!cancelled) setSessionId(s.id);
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]); // createSession is stable enough for one session per transaction

  const messages: ChatRow[] = useMemo(() => {
    const fromServer =
      sessionQuery.data?.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        meta:
          m.role === 'ASSISTANT' && m.citations && typeof m.citations === 'object'
            ? (m.citations as CopilotMessageResponse['assistantMessage'])
            : undefined,
      })) ?? [];
    return fromServer.length ? fromServer : localRows;
  }, [sessionQuery.data, localRows]);

  const tx = sessionQuery.data?.transaction;

  const onSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !sessionId || send.isPending) return;
    setInput('');
    try {
      const result = await send.mutateAsync({ content, documentId });
      setLocalRows((prev) => [
        ...prev,
        {
          id: result.userMessage.id,
          role: result.userMessage.role,
          content: result.userMessage.content,
        },
        {
          id: result.assistantMessage.id,
          role: result.assistantMessage.role,
          content: result.assistantMessage.content,
          meta: result.assistantMessage,
        },
      ]);
      void sessionQuery.refetch();
    } catch {
      /* surfaced via send.error */
    }
  };

  if (createSession.isPending && !sessionId) {
    return <LoadingState label="Starting Copilot session…" />;
  }
  if (createSession.isError) {
    return (
      <ErrorState
        title="Unable to start Copilot"
        description={
          createSession.error instanceof Error
            ? createSession.error.message
            : undefined
        }
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h2 className="flex items-center gap-2 font-headline text-2xl font-bold text-primary">
          <span className="material-symbols-outlined text-secondary">psychology</span>
          AI Transaction Copilot
        </h2>
        <StatusBadge label="Mock AI · Demo Knowledge" tone="ai" />
      </div>

      {tx ? (
        <Card className="border-s-4 border-secondary-fixed-dim">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">assignment</span>
            <div>
              <h4 className="font-label text-sm font-bold text-primary">Active context</h4>
              <p className="text-sm text-on-surface-variant">
                {tx.serviceName} · {tx.referenceCode}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge label={tx.status.replaceAll('_', ' ')} tone="ai" />
                <StatusBadge
                  label={`Readiness ${tx.readinessScore ?? '—'}%`}
                  tone="info"
                />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-on-surface-variant">
            General Copilot (no transaction linked). Open from a workspace for
            transaction-aware answers.
          </p>
        </Card>
      )}

      <div className="min-h-[280px] space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        {messages.length === 0 && !send.isPending ? (
          <EmptyState
            title="Ask about your transaction"
            description="Try a suggested prompt below. Answers use live transaction data and GovFlow demo knowledge."
          />
        ) : null}

        {messages.map((m) =>
          m.role === 'USER' ? (
            <div
              key={m.id}
              className="ms-auto max-w-[85%] rounded-2xl rounded-ee-sm bg-primary px-4 py-3 text-on-primary"
            >
              {m.content}
            </div>
          ) : (
            <div key={m.id} className="flex max-w-[90%] flex-col gap-2">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div className="rounded-2xl rounded-es-sm bg-surface-container px-4 py-3 text-on-surface whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
              {m.meta?.confidenceBand ? (
                <div className="ms-12 flex flex-wrap gap-2">
                  <StatusBadge
                    label={`AI confidence ${m.meta.confidenceBand}`}
                    tone={
                      m.meta.confidenceBand === 'HIGH'
                        ? 'success'
                        : m.meta.confidenceBand === 'LOW'
                          ? 'warning'
                          : 'info'
                    }
                  />
                  {m.meta.noKnowledge ? (
                    <StatusBadge label="No knowledge match" tone="warning" />
                  ) : null}
                </div>
              ) : null}
              {m.meta?.sources?.length ? (
                <div className="ms-12 text-xs text-on-surface-variant">
                  Sources:{' '}
                  {m.meta.sources.map((s) => s.title).join(' · ')}
                </div>
              ) : null}
              {m.meta?.suggestedActions?.length ? (
                <div className="ms-12 flex flex-wrap gap-2">
                  {m.meta.suggestedActions.map((a) =>
                    a.href ? (
                      <Link key={a.code + a.label} to={a.href}>
                        <Button variant="secondary" className="!py-1 !text-xs">
                          {a.label}
                        </Button>
                      </Link>
                    ) : (
                      <StatusBadge key={a.code} label={a.label} tone="neutral" />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          ),
        )}

        {send.isPending ? <LoadingState label="Thinking…" /> : null}
        {send.isError ? (
          <ErrorState
            title="Copilot could not answer"
            description={
              send.error instanceof Error ? send.error.message : undefined
            }
            onRetry={() => void onSend(input || draft)}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 font-label text-xs text-primary shadow-sm hover:border-secondary hover:text-secondary"
            onClick={() => void onSend(prompt.label)}
          >
            <span className="material-symbols-outlined text-[16px]">{prompt.icon}</span>
            {prompt.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-4 pe-14 ps-4 outline-none focus:border-primary"
          placeholder="Ask about this transaction…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void onSend();
          }}
        />
        <button
          type="button"
          className="absolute end-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-on-primary disabled:opacity-50"
          disabled={!sessionId || send.isPending || !input.trim()}
          onClick={() => void onSend()}
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
