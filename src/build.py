css=open('styles.css',encoding='utf-8').read()
body=open('body.html',encoding='utf-8').read()
js=open('main.js',encoding='utf-8').read()
html=f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>D'ORÉ Anahata - Aceite corporal hidratante de uso diario</title>
<meta name="description" content="D'ORÉ es un aceite corporal hidratante de uso diario, formulado con aceites botanicos, que acompaña tu bronceado cuando te expones al sol. Edicion inaugural, 350 frascos numerados a mano." />
<meta name="theme-color" content="#1A1A1A" />
<script>
/* Lite mode: phones, tablets, weaker machines and reduced-motion users get a
   CSS sun instead of the WebGL shader. Runs before first paint to avoid a flash. */
(function(){{var d=document.documentElement,n=navigator,lite=innerWidth<1024||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||(n.deviceMemory&&n.deviceMemory<=4)||matchMedia("(prefers-reduced-motion: reduce)").matches||matchMedia("(hover: none)").matches;if(lite)d.classList.add("is-lite");if(matchMedia("(max-height:520px) and (orientation:landscape)").matches)d.classList.add("is-static-hero");}})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />
<style>
{css}
</style>
<script type="importmap">
{{ "imports": {{ "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js" }} }}
</script>
</head>
<body>
{body}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script type="module">
{js}
</script>
</body>
</html>
'''
open('/mnt/user-data/outputs/dore-anahata-replica/index.html','w',encoding='utf-8').write(html)
print(len(html))
