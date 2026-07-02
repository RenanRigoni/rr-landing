#!/usr/bin/env python3
"""
Dev.RR — Agendamento de posts + criação de campanhas Meta Ads
Posts 07 a 17 de Junho 2026
"""

import requests
import json
import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo

# === CONFIG ===
TOKEN = "EAAZAtLqfxqJABRg8ZBeKfebhFot7JLeGcYSAZCQbPxHJ4zZBGZAUmRGe5uxC5J0WZAnUFqZCnClYXw7NFjM4XboJExYleBSs3dXwcgIqar9MdFStEmSZB1T1NrVwyw9ovQw8zs3MtZA9vQewXgQySsSJBEBjpf1SZB8ZCUlmq4ENRycL6m6jlnsOGRFqIObGzmpsgZDZD"
PAGE_ID = "1195523200308931"
IG_ID = "17841435448651545"
AD_ACCOUNT = "act_1542246220819729"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BRT = ZoneInfo("America/Sao_Paulo")
API = "https://graph.facebook.com/v21.0"
DAILY_BUDGET_CENTS = 800  # R$ 8,00

# Geo keys (Minas Gerais)
CITIES = [
    {"key": "262968", "radius": 17, "distance_unit": "kilometer"},  # Patrocínio
    {"key": "262921", "radius": 17, "distance_unit": "kilometer"},  # Patos de Minas
    {"key": "273173", "radius": 17, "distance_unit": "kilometer"},  # Uberlândia
]

# === POSTS ===
POSTS = [
    {
        "num": "07",
        "date": "2026-06-19", "time": "21:00",
        "folder": "post07-slides",
        "caption": """Não existe "um site serve pra tudo".

Depende do seu negócio, do seu cliente, e do que você quer que o site faça por você.

Swipe pra ver qual faz mais sentido pro seu caso. 👆

Me chama depois. A gente descobre junto qual é o seu.
🔗 Link na bio

#webdesign #sitepronto #landing #negóciolocal #desenvolvimentoweb""",
    },
    {
        "num": "08",
        "date": "2026-06-20", "time": "20:30",
        "folder": "post08-slides",
        "caption": """Por trás de cada site, tem muito café e muita atenção a detalhe.

Da conversa inicial até o site no ar:
→ Entendo o seu negócio
→ Defino a estrutura e o fluxo
→ Desenvolvo com foco em velocidade e conversão
→ Ajusto com você até ficar certo
→ Coloco no ar

Não é template. Não é arrastar e soltar.

É código, é identidade, é resultado.

Curioso como fica o seu? Me chama. 📲

#bastidores #webdev #desenvolvimentoweb #sitepronto #codigo #devlife""",
    },
    {
        "num": "09",
        "date": "2026-06-21", "time": "20:30",
        "folder": "post09-slides",
        "caption": """Quando alguém digita "chaveiro perto de mim" às 23h…

Quem aparece são os negócios que trabalharam pra aparecer.

SEO local não é mágica. É estrutura. É site rápido. É conteúdo certo.

E isso eu coloco em cada site que entrego.

Swipe pra entender como funciona. 👆

📲 Me chama pra a gente conversar sobre o seu negócio.
🔗 Link na bio

#seolocal #googlenegocios #presençadigital #webdesign #negóciolocal #apareçanogoogle""",
    },
    {
        "num": "10",
        "date": "2026-06-23", "time": "19:00",
        "folder": "post10-slides",
        "caption": """Sabe qual é o pior tipo de perda pra um negócio?

A perda invisível.

Aquele cliente que te pesquisou, não te achou, e nunca te ligou.
Aquele pedido que foi pro concorrente sem você nem saber.
Aquela oportunidade que passou às 22h de uma sexta.

Você não perdeu porque é ruim.
Perdeu porque não estava onde precisava estar.

Eu conserto isso.

Site profissional, rápido, que trabalha por você enquanto você dorme.

Me chama. O link tá na bio. 📲

#negóciolocal #presençadigital #sitepronto #webdesign #vendas #oportunidade""",
    },
    {
        "num": "11",
        "date": "2026-06-24", "time": "12:15",
        "folder": "post11-slides",
        "caption": """Salva esse post. 📌

É o checklist rápido de presença digital que todo negócio local deveria fazer uma vez por ano.

Se marcou mais "não" do que "sim", eu posso te ajudar.

Me chama via link na bio. 👇

#checklist #presençadigital #negóciolocal #webdesign #sitepronto #marketingdigital""",
    },
    {
        "num": "12",
        "date": "2026-06-25", "time": "09:00",
        "folder": "post12-slides",
        "caption": """Vender pelo Instagram funciona até certo ponto.

Depois começa o improviso:
→ preço perguntado no direct
→ pedido perdido no WhatsApp
→ pagamento combinado manualmente
→ estoque sem controle
→ cliente desistindo porque deu trabalho comprar

E-commerce não é só "colocar produto na internet".

É ter vitrine, pedido, pagamento e organização em um só lugar.

Se você vende produto e ainda fecha tudo manualmente, talvez esteja na hora de ter uma loja online própria.

Me chama. Eu te ajudo a estruturar isso do jeito certo.

#ecommerce #lojaonline #vendasonline #negociodigital #presencadigital #devrr""",
    },
    {
        "num": "13",
        "date": "2026-06-26", "time": "21:00",
        "folder": "post13-slides",
        "caption": """Você não perde cliente só por preço.

Às vezes perde porque esqueceu de responder.
Porque não anotou quem pediu orçamento.
Porque não voltou no lead depois de 3 dias.
Porque tudo fica espalhado entre WhatsApp, papel, planilha e memória.

CRM é uma forma simples de organizar quem chegou, em que etapa está e qual é o próximo passo.

Não precisa ser complicado.
Precisa funcionar para sua rotina.

Se seu comercial está bagunçado, eu posso criar uma estrutura sob medida.

#crm #vendas #atendimento #negociolocal #organizacaocomercial #devrr""",
    },
    {
        "num": "14",
        "date": "2026-06-27", "time": "20:30",
        "folder": "post14-slides",
        "caption": """Toda empresa começa controlando alguma coisa em planilha.

Até a planilha virar o problema.

Quando tem muita aba, muita versão, muita informação duplicada e gente perguntando "qual é a planilha certa?", você não precisa de mais organização manual.

Você precisa de um sistema.

Um painel feito para o seu processo:
cadastros, pedidos, clientes, agenda, relatórios, permissões e o que mais fizer sentido para sua operação.

Sistema personalizado é para quando a ferramenta genérica já não acompanha o jeito que sua empresa trabalha.

Me chama e a gente desenha isso juntos.

#sistemas #sistemapersonalizado #automacao #gestao #negociodigital #devrr""",
    },
    {
        "num": "15",
        "date": "2026-06-28", "time": "20:30",
        "folder": "post15-slides",
        "caption": """Tráfego pago não salva uma estrutura ruim.

Se o anúncio leva para uma página confusa, um WhatsApp sem contexto ou um perfil que não explica nada, você está pagando por clique e perdendo oportunidade.

Antes de colocar dinheiro em anúncio, precisa ter:
→ oferta clara
→ página de destino
→ botão de WhatsApp bem posicionado
→ mensagem inicial pronta
→ acompanhamento dos contatos

Anúncio bom não é só criativo bonito.
É caminho claro até a conversa.

Eu posso te ajudar com a estrutura e com as mídias para campanha.

#trafegopago #anunciosonline #landingpage #captacaodeleads #marketingdigital #devrr""",
    },
    {
        "num": "16",
        "date": "2026-06-29", "time": "19:00",
        "folder": "post16-slides",
        "caption": """Post bonito ajuda.

Mas post bonito sem objetivo vira só enfeite no feed.

Uma boa mídia digital precisa responder:
→ quem precisa ver isso?
→ qual dor ela ativa?
→ qual serviço ela apresenta?
→ qual ação a pessoa deve tomar depois?

Eu crio posts, carrosséis e artes para anúncios pensando em clareza, identidade e conversão.

Conteúdo profissional não é só estética.
É comunicação que ajuda o cliente a entender por que deve falar com você.

#midiasdigitais #socialmedia #carrossel #criativos #designpararedessociais #devrr""",
    },
    {
        "num": "17",
        "date": "2026-06-30", "time": "19:00",
        "folder": "post17-slides",
        "caption": """Às vezes o que sua empresa precisa não é só um site.

É uma ferramenta.

Um portal para cliente.
Um painel interno.
Um sistema de assinatura.
Um MVP para testar uma ideia.
Um SaaS simples para vender uma solução recorrente.

O ponto não é começar gigante.
É começar com a primeira versão certa: o mínimo que resolve uma dor real e pode evoluir.

Eu ajudo a transformar ideia, processo ou serviço em produto digital.

Me chama e a gente desenha o primeiro passo.

#saas #mvp #produtodigital #sistemapersonalizado #startupbrasil #devrr""",
    },
]


# === HELPERS ===

def brt_unix(date_str, time_str):
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M").replace(tzinfo=BRT)
    return int(dt.timestamp())


def gpost(path, params=None):
    p = {**(params or {}), "access_token": TOKEN}
    r = requests.get(f"{API}/{path}", params=p)
    return r.json()


def post(path, data=None, files=None):
    d = {**(data or {}), "access_token": TOKEN}
    r = requests.post(f"{API}/{path}", data=d, files=files)
    return r.json()


def check(result, label):
    if "error" in result:
        raise Exception(f"{label} falhou: {result['error']['message']}")
    return result


# === FACEBOOK ===

def upload_fb_photo(image_path):
    """Sobe imagem para a Página como foto não publicada. Retorna (photo_id, url_pública)."""
    print(f"    Upload FB: {os.path.basename(image_path)}")
    with open(image_path, "rb") as f:
        r = check(post(
            f"{PAGE_ID}/photos",
            data={"published": "false"},
            files={"source": (os.path.basename(image_path), f, "image/png")},
        ), "upload_fb_photo")

    photo_id = r["id"]
    url_r = check(gpost(photo_id, {"fields": "images"}), "get_photo_url")
    url = url_r["images"][0]["source"]
    print(f"    ✓ photo_id={photo_id}")
    return photo_id, url


def schedule_fb_post(photo_ids, caption, ts):
    """Cria post agendado na Página com imagens já carregadas."""
    data = {
        "message": caption,
        "published": "false",
        "scheduled_publish_time": str(ts),
    }
    if len(photo_ids) == 1:
        data["object_attachment"] = photo_ids[0]
    else:
        for i, pid in enumerate(photo_ids):
            data[f"attached_media[{i}]"] = json.dumps({"media_fbid": pid})

    r = check(post(f"{PAGE_ID}/feed", data=data), "schedule_fb_post")
    return r["id"]  # formato: page_id_post_id


# === INSTAGRAM ===

def create_ig_container(image_url, caption=None, is_item=False, ts=None):
    """Cria container de mídia no Instagram."""
    data = {"image_url": image_url}
    if is_item:
        data["is_carousel_item"] = "true"
    else:
        if caption:
            data["caption"] = caption
        if ts:
            data["scheduled_publish_time"] = str(ts)
            data["published"] = "false"

    r = check(post(f"{IG_ID}/media", data=data), "create_ig_container")
    return r["id"]


def create_ig_carousel(children_ids, caption, ts):
    """Cria container de carrossel agendado."""
    data = {
        "media_type": "CAROUSEL",
        "children": ",".join(children_ids),
        "caption": caption,
        "scheduled_publish_time": str(ts),
        "published": "false",
    }
    r = check(post(f"{IG_ID}/media", data=data), "create_ig_carousel")
    return r["id"]


def publish_ig_now(container_id):
    """Publica container imediatamente (fallback se scheduled não funcionar)."""
    r = check(post(f"{IG_ID}/media_publish", data={"creation_id": container_id}), "publish_ig_now")
    return r["id"]


# === META ADS ===

def create_campaign(fb_post_id, num):
    """Cria campanha PAUSADA de engajamento para o post."""
    numeric_id = fb_post_id.split("_")[-1] if "_" in fb_post_id else fb_post_id
    story_id = f"{PAGE_ID}_{numeric_id}"

    print(f"  Criando campanha para object_story_id={story_id}")

    # Campanha
    camp = check(post(f"{AD_ACCOUNT}/campaigns", data={
        "name": f"DEV.RR | Post {num} | Engajamento",
        "objective": "OUTCOME_ENGAGEMENT",
        "status": "PAUSED",
        "special_ad_categories": "[]",
    }), "campaign")
    camp_id = camp["id"]

    # Adset
    targeting = {
        "geo_locations": {"cities": CITIES},
        "age_min": 24,
        "age_max": 60,
        "targeting_automation": {"advantage_audience": 0},
    }
    adset = check(post(f"{AD_ACCOUNT}/adsets", data={
        "name": f"DEV.RR | Post {num} | Triângulo Mineiro",
        "campaign_id": camp_id,
        "optimization_goal": "POST_ENGAGEMENT",
        "billing_event": "IMPRESSIONS",
        "daily_budget": str(DAILY_BUDGET_CENTS),
        "targeting": json.dumps(targeting),
        "status": "PAUSED",
        "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
    }), "adset")
    adset_id = adset["id"]

    # Creative
    creative = check(post(f"{AD_ACCOUNT}/adcreatives", data={
        "name": f"DEV.RR | Post {num} | Creative",
        "object_story_id": story_id,
    }), "creative")
    creative_id = creative["id"]

    # Ad
    ad = check(post(f"{AD_ACCOUNT}/ads", data={
        "name": f"DEV.RR | Post {num} | Ad",
        "adset_id": adset_id,
        "creative": json.dumps({"creative_id": creative_id}),
        "status": "PAUSED",
    }), "ad")

    return {
        "campaign_id": camp_id,
        "adset_id": adset_id,
        "ad_id": ad["id"],
        "story_id": story_id,
    }


# === MAIN ===

def process_post(p):
    print(f"\n{'='*55}")
    print(f"POST {p['num']} — {p['date']} {p['time']} BRT")

    slides_dir = os.path.join(BASE_DIR, p["folder"])
    slides = sorted([
        os.path.join(slides_dir, f)
        for f in os.listdir(slides_dir)
        if f.lower().endswith(".png")
    ])
    print(f"  Slides: {len(slides)}")

    ts = brt_unix(p["date"], p["time"])

    # 1. Upload imagens para Facebook
    print("  [FB] Subindo imagens...")
    photo_ids, photo_urls = [], []
    for s in slides:
        pid, url = upload_fb_photo(s)
        photo_ids.append(pid)
        photo_urls.append(url)
        time.sleep(0.5)

    # 2. Agendar post no Facebook
    print("  [FB] Agendando post...")
    fb_post_id = schedule_fb_post(photo_ids, p["caption"], ts)
    print(f"  ✓ FB post_id: {fb_post_id}")

    # 3. Agendar post no Instagram
    print("  [IG] Agendando post...")
    try:
        if len(slides) == 1:
            container_id = create_ig_container(photo_urls[0], caption=p["caption"], ts=ts)
        else:
            children = []
            for url in photo_urls:
                cid = create_ig_container(url, is_item=True)
                children.append(cid)
                time.sleep(0.3)
            container_id = create_ig_carousel(children, p["caption"], ts)
        print(f"  ✓ IG container_id: {container_id}")
        ig_result = container_id
    except Exception as e:
        print(f"  ⚠ IG scheduling error: {e}")
        ig_result = f"ERRO: {e}"

    # 4. Criar campanha no Ads Manager
    print("  [ADS] Criando campanha...")
    try:
        ads = create_campaign(fb_post_id, p["num"])
        print(f"  ✓ Campaign: {ads['campaign_id']}")
    except Exception as e:
        print(f"  ⚠ Ads error: {e}")
        ads = f"ERRO: {e}"

    return {
        "post": p["num"],
        "scheduled": f"{p['date']} {p['time']}",
        "fb_post_id": fb_post_id,
        "ig_container_id": ig_result,
        "ads": ads,
    }


if __name__ == "__main__":
    results = []
    errors = []

    for p in POSTS:
        try:
            r = process_post(p)
            results.append(r)
            print(f"\n✅ Post {p['num']} concluído.")
        except Exception as e:
            print(f"\n❌ Post {p['num']} ERRO: {e}")
            errors.append({"post": p["num"], "error": str(e)})
        time.sleep(1)

    output = {"results": results, "errors": errors}

    out_path = os.path.join(BASE_DIR, "schedule_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n\n{'='*55}")
    print(f"CONCLUÍDO: {len(results)} posts agendados, {len(errors)} erros")
    print(f"Resultados salvos em: {out_path}")

    if errors:
        print("\nERROS:")
        for e in errors:
            print(f"  Post {e['post']}: {e['error']}")
