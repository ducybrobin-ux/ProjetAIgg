# AIgg - launcher Windows (PowerShell) - facultatif
# Si l'execution des scripts est bloquee par la politique (Restricted),
# PowerShell afficherez le contenu au lieu d'executer. Utiliser alors AIgg.cmd.
Set-Location -LiteralPath $PSScriptRoot

$pol = Get-ExecutionPolicy
if ($pol -eq 'Restricted') {
  Write-Host 'Execution de scripts desactivee (politique Windows).' -ForegroundColor Yellow
  Write-Host 'Utilise AIgg.cmd :  .\AIgg.cmd status | server | tests' -ForegroundColor Yellow
  exit 1
}

if ($args.Count -eq 0) {
  node AIgg.js status
} else {
  node AIgg.js $args
}