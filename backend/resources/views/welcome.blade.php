<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KAWAL - Kelola Alur Warta, Artikel, dan Laporan</title>
    @viteReactRefresh
    @vite(['resources/js/main.tsx'])
</head>
<body class="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
    <div id="root"></div>
</body>
</html>
