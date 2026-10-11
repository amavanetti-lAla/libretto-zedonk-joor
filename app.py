import re
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="Libretto Zedonk ↔ JOOR", layout="wide")
st.markdown(
    "<style>.block-container{padding:0!important;max-width:100%!important}"
    "header{display:none}</style>",
    unsafe_allow_html=True,
)

BASE = Path(__file__).parent
html = (BASE / "index.html").read_text(encoding="utf-8")

def read(name):
    return (BASE / name).read_text(encoding="utf-8")

# inlina style.css
html = re.sub(
    r'<link rel="stylesheet" href="([^"]+)"\s*/?>',
    lambda m: f"<style>{read(m.group(1))}</style>",
    html,
)
# inlina data.js, firebase-config.js, app.js (non tocca gli script https://)
html = re.sub(
    r'<script src="(?!https?:)([^"]+)"></script>',
    lambda m: f"<script>{read(m.group(1))}</script>",
    html,
)

components.html(html, height=1000, scrolling=True)
