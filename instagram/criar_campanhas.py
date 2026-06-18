#!/usr/bin/env python3
"""
Dev.RR — Criação e gestão de campanhas para posts do Instagram
Uso: py criar_campanhas.py

Roda diariamente via Task Scheduler.
- Detecta posts novos → cria campanha ATIVA
- Pausa campanhas com mais de 7 dias automaticamente
"""

import os
import requests
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# Carrega .env.local se existir (uso local)
_env_file = Path(__file__).parent / ".env.local"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

# === CONFIG ===
PAGE_TOKEN = os.environ["META_PAGE_TOKEN"]
SYS_TOKEN  = os.environ["META_SYS_TOKEN"]
PAGE_ID    = "1195523200308931"
IG_ID      = "17841435448651545"
AD_ACCOUNT = "act_1542246220819729"
API        = "https://graph.facebook.com/v21.0"
RESULTS_FILE = os.path.join(os.path.dirname(__file__), "campanhas_criadas.json")

DAILY_BUDGET_CENTS = 800  # R$ 8,00
CAMPAIGN_DAYS = 7

CITIES = [
    {"key": "262968", "radius": 17, "distance_unit": "kilometer"},  # Patrocínio MG
    {"key": "262921", "radius": 17, "distance_unit": "kilometer"},  # Patos de Minas MG
    {"key": "273173", "radius": 17, "distance_unit": "kilometer"},  # Uberlândia MG
]

CRONOGRAMA = [
    {"num": "05", "keywords": ["Mas eu já tenho Instagram", "tenho Instagram"]},
    {"num": "06", "keywords": ["Dado real da Amazon", "100 milissegundos"]},
    {"num": "07", "keywords": ["um site serve pra tudo", "Não existe"]},
    {"num": "08", "keywords": ["muito café", "Bastidores", "Por trás de cada site"]},
    {"num": "09", "keywords": ["chaveiro perto de mim", "SEO local"]},
    {"num": "10", "keywords": ["perda invisível", "pior tipo de perda"]},
    {"num": "11", "keywords": ["Salva esse post", "checklist"]},
    {"num": "12", "keywords": ["Vender pelo Instagram funciona", "E-commerce"]},
    {"num": "13", "keywords": ["não perde cliente só por preço", "CRM"]},
    {"num": "14", "keywords": ["planilha virar o problema", "Toda empresa começa"]},
    {"num": "15", "keywords": ["Tráfego pago não salva", "estrutura ruim"]},
    {"num": "16", "keywords": ["Post bonito ajuda", "post bonito sem objetivo"]},
    {"num": "17", "keywords": ["empresa precisa não é só um site", "SaaS", "MVP"]},
]


# === HELPERS ===

def gget(path, params=None, token=None):
    p = {**(params or {}), "access_token": token or PAGE_TOKEN}
    return requests.get(f"{API}/{path}", params=p).json()

def gpost(path, data=None, token=None):
    d = {**(data or {}), "access_token": token or SYS_TOKEN}
    return requests.post(f"{API}/{path}", data=d).json()

def check(r, label):
    if "error" in r:
        raise Exception(f"{label}: {r['error']['message']}")
    return r

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def load_results():
    try:
        with open(RESULTS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_results(results):
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


# === LÓGICA ===

def match_post_num(caption):
    if not caption:
        return None
    caption_lower = caption.lower()
    for entry in CRONOGRAMA:
        for kw in entry["keywords"]:
            if kw.lower() in caption_lower:
                return entry["num"]
    return None


def get_facebook_post_id_for_ig(ig_media_id):
    ig = gget(ig_media_id, {"fields": "id,timestamp,caption"})
    if "timestamp" not in ig:
        return None

    ts_str = ig["timestamp"]
    dt = datetime.fromisoformat(ts_str.replace("+0000", "+00:00"))
    ts_unix = int(dt.timestamp())

    feed = gget(f"{PAGE_ID}/feed", {"fields": "id,message,created_time", "limit": 20})
    for post in feed.get("data", []):
        ct = post.get("created_time", "")
        if not ct:
            continue
        post_dt = datetime.fromisoformat(ct.replace("+0000", "+00:00"))
        if abs(int(post_dt.timestamp()) - ts_unix) <= 300:
            return post["id"]

    return None


def fetch_ig_posts(limit=25):
    return gget(f"{IG_ID}/media", {
        "fields": "id,media_type,timestamp,caption",
        "limit": limit,
    }, token=PAGE_TOKEN).get("data", [])


def create_campaign(fb_post_id, num):
    numeric = fb_post_id.split("_")[-1] if "_" in fb_post_id else fb_post_id
    story_id = f"{PAGE_ID}_{numeric}"

    camp = check(gpost(f"{AD_ACCOUNT}/campaigns", {
        "name": f"DEV.RR | Post {num} | Alcance",
        "objective": "OUTCOME_AWARENESS",
        "status": "ACTIVE",
        "special_ad_categories": "[]",
        "is_adset_budget_sharing_enabled": "False",
    }), "campanha")

    adset = check(gpost(f"{AD_ACCOUNT}/adsets", {
        "name": f"DEV.RR | Post {num} | Triângulo Mineiro",
        "campaign_id": camp["id"],
        "optimization_goal": "REACH",
        "billing_event": "IMPRESSIONS",
        "daily_budget": str(DAILY_BUDGET_CENTS),
        "targeting": json.dumps({
            "geo_locations": {"cities": CITIES},
            "age_min": 24,
            "age_max": 60,
            "targeting_automation": {"advantage_audience": 0},
        }),
        "status": "ACTIVE",
        "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
    }), "adset")

    creative = check(gpost(f"{AD_ACCOUNT}/adcreatives", {
        "name": f"DEV.RR | Post {num} | Creative",
        "object_story_id": story_id,
    }), "creative")

    ad = check(gpost(f"{AD_ACCOUNT}/ads", {
        "name": f"DEV.RR | Post {num} | Ad",
        "adset_id": adset["id"],
        "creative": json.dumps({"creative_id": creative["id"]}),
        "status": "ACTIVE",
    }), "ad")

    return {
        "campaign_id": camp["id"],
        "adset_id": adset["id"],
        "ad_id": ad["id"],
        "story_id": story_id,
        "activated_at": now_iso(),
    }


def pause_expired_campaigns(results):
    now = datetime.now(timezone.utc)
    paused_count = 0

    for record in results:
        if "error" in record or "paused_at" in record:
            continue
        activated_at = record.get("activated_at")
        if not activated_at:
            continue

        activated_dt = datetime.fromisoformat(activated_at)
        days_active = (now - activated_dt).days

        if days_active >= CAMPAIGN_DAYS:
            camp_id = record.get("campaign_id")
            num = record.get("post", "?")
            r = gpost(camp_id, {"status": "PAUSED"})
            if "error" not in r:
                record["paused_at"] = now_iso()
                print(f"PAUSADA  Post {num} — {days_active} dias ativo")
                paused_count += 1
            else:
                print(f"ERRO ao pausar Post {num}: {r['error']['message']}")

    return paused_count


def main():
    existing = load_results()
    already_done = {r["post"] for r in existing if "error" not in r}
    print(f"Campanhas ja criadas: {sorted(already_done) or 'nenhuma'}")

    # Pausa campanhas expiradas
    print("\nVerificando campanhas para pausar...")
    paused = pause_expired_campaigns(existing)
    if paused == 0:
        print("  Nenhuma campanha expirada.")

    # Cria campanhas para posts novos
    print("\nBuscando posts publicados no Instagram...")
    ig_posts = fetch_ig_posts(limit=25)
    print(f"Posts encontrados: {len(ig_posts)}\n")

    created_count = 0

    for p in ig_posts:
        caption = p.get("caption", "")
        num = match_post_num(caption)
        ts = p.get("timestamp", "?")
        preview = (caption or "")[:55].replace("\n", " ")

        if not num:
            print(f"IGNORADO  [{ts[:10]}] {preview}...")
            continue

        if num in already_done:
            print(f"Post {num}  [{ts[:10]}] ja tem campanha — pulando")
            continue

        print(f"Post {num}  [{ts[:10]}] {preview}...")

        fb_post_id = get_facebook_post_id_for_ig(p["id"])
        if not fb_post_id:
            print(f"  AVISO: nao encontrou FB post ID — usando IG media ID")
            fb_post_id = p["id"]

        try:
            ads = create_campaign(fb_post_id, num)
            print(f"  OK — campaign={ads['campaign_id']} (ATIVA, pausa em {CAMPAIGN_DAYS} dias)")
            existing.append({
                "post": num,
                "ig_id": p["id"],
                "fb_post_id": fb_post_id,
                **ads,
            })
            already_done.add(num)
            created_count += 1
        except Exception as e:
            print(f"  ERRO — {e}")
            existing.append({"post": num, "ig_id": p["id"], "error": str(e)})

    save_results(existing)
    print(f"\nConcluido: {created_count} criadas, {paused} pausadas nesta execucao")
    print(f"Resultados em: {RESULTS_FILE}")


if __name__ == "__main__":
    main()
