"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAnonymousReview } from "@/lib/actions/reviews";
import { createClient } from "@/lib/supabase/client";

type AnonymousReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

interface AnonymousReviewsProps {
  productId: string;
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(dateValue));
}

export function AnonymousReviews({ productId }: AnonymousReviewsProps) {
  const [reviews, setReviews] = useState<AnonymousReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    return reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;
  }, [reviews]);

  const loadReviews = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("reviews")
      .select("id,rating,comment,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setFeedback(`Erro ao carregar avaliacoes: ${error.message}`);
      setIsLoading(false);
      return;
    }

    setReviews((data ?? []) as AnonymousReview[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadReviews();
  }, [productId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");

    startTransition(async () => {
      const result = await submitAnonymousReview({
        productId,
        rating,
        comment,
      });

      if (!result.ok) {
        setFeedback(result.error);
        return;
      }

      setComment("");
      setRating(5);
      setFeedback("Avaliacao anonima enviada com sucesso.");
      await loadReviews();
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/60 p-4">
      <header className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">Avaliações anônimas</h4>
        <p className="text-xs text-muted-foreground">
          Nenhum nome, email ou identificador pessoal é coletado.
        </p>
        {averageRating !== null && (
          <p className="text-xs text-muted-foreground">
            Média atual: <strong>{averageRating.toFixed(1)}</strong> ({reviews.length} avaliações)
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border p-3">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className="rounded p-1"
              aria-label={`Dar nota ${value}`}
            >
              <Star
                className={`size-5 ${
                  value <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={4000}
          placeholder="Comentário opcional (sem dados pessoais)"
          className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enviando..." : "Deixar uma avaliação anônima"}
        </Button>
      </form>

      {feedback && (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          {feedback}
        </p>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-xs text-muted-foreground">Carregando avaliações...</p>}

        {!isLoading && reviews.length === 0 && (
          <p className="text-xs text-muted-foreground">Ainda não há avaliações para este produto.</p>
        )}

        {reviews.map((review) => (
          <article key={review.id} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`${review.id}-star-${index}`}
                    className={`size-3.5 ${
                      index < review.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">{formatDate(review.created_at)}</span>
            </div>

            <p className="mb-1 text-xs font-medium text-foreground/90">Comprador Anônimo</p>
            <p className="text-sm text-muted-foreground">
              {review.comment?.trim() || "Sem comentário."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
