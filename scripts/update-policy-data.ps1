param(
    [string]$ApiKey = "G7N6elMlYOmqsOnctk%2B0X1Dpyz1ajBFF82gcH8Sl%2FgRDD5Jb4gangmAU2KZgmWSerzjtZqEQLlAxay4dFH3IPw%3D%3D",
    [int]$MaxPages = 20
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$configFile = Join-Path $scriptDir "policy-filter-config.json"
$outputDir = Join-Path $rootDir "data"
$outputFile = Join-Path $outputDir "policy-data.json"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$configJson = [System.IO.File]::ReadAllText($configFile, [System.Text.Encoding]::UTF8)
$config = $configJson | ConvertFrom-Json

$fId = $config.fields.id
$fName = $config.fields.name
$fSummary = $config.fields.summary
$fTarget = $config.fields.target
$fContent = $config.fields.content
$fCategory = $config.fields.category
$fType = $config.fields.type
$fCriteria = $config.fields.criteria
$fAgency = $config.fields.agency
$fUrl = $config.fields.url

$dTarget = $config.defaults.defaultTarget
$dApplyName = $config.defaults.applyName
$dDocs = $config.defaults.docs
$dSource = $config.defaults.source

Write-Host "Config loaded. Categories count: $($config.categories.Count)"

$client = New-Object System.Net.WebClient
$client.Encoding = [System.Text.Encoding]::UTF8

$seenIds = @{}
$seenTitles = @{}
$filteredList = [System.Collections.ArrayList]::new()

Write-Host "Fetching government services from API..."

for ($page = 1; $page -le $MaxPages; $page++) {
    $url = "https://api.odcloud.kr/api/gov24/v3/serviceList?page=$page&perPage=100&serviceKey=$ApiKey"
    try {
        $rawJson = $client.DownloadString($url)
        $resp = $rawJson | ConvertFrom-Json
        $items = $resp.data
        if (-not $items -or $items.Count -eq 0) {
            Write-Host "Page $page is empty. Stopping fetch."
            break
        }

        Write-Host "Page $page : received $($items.Count) items."

        foreach ($item in $items) {
            $svcId = [string]($item.$fId)
            $svcName = [string]($item.$fName)
            if (-not $svcId -or -not $svcName) { continue }
            if ($seenIds.ContainsKey($svcId) -or $seenTitles.ContainsKey($svcName)) { continue }

            $pSummary = [string]($item.$fSummary)
            $pTarget = [string]($item.$fTarget)
            $pContent = [string]($item.$fContent)
            $pCat = [string]($item.$fCategory)
            $pType = [string]($item.$fType)
            $pAgency = [string]($item.$fAgency)
            $pUrl = [string]($item.$fUrl)

            $searchBlob = "$svcName $pSummary $pTarget $pContent $pCat"

            $matchedCategory = $null
            $matchedKeyword = $null

            foreach ($cat in $config.categories) {
                foreach ($kw in $cat.keywords) {
                    if ($searchBlob.IndexOf($kw, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
                        $matchedCategory = $cat
                        $matchedKeyword = $kw
                        break
                    }
                }
                if ($matchedCategory) { break }
            }

            if ($matchedCategory) {
                $seenIds[$svcId] = $true
                $seenTitles[$svcName] = $true

                $badge = if ($pType) { "$pType" } else { $matchedCategory.defaultBadge }

                $details = @()
                if ($pContent) {
                    $lines = $pContent -split "[\r\n]+" | Where-Object { $_.Trim().Length -gt 0 }
                    foreach ($l in $lines) {
                        $cleanLine = $l.Trim().TrimStart(@('-', '*', '.', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ')', '(', ' ', ':'))
                        if ($cleanLine.Length -gt 5 -and $details.Count -lt 4) {
                            $details += $cleanLine
                        }
                    }
                }
                if ($details.Count -eq 0 -and $pSummary) {
                    $details += $pSummary
                }

                $policyObj = [ordered]@{
                    id = "gov-$svcId"
                    category = $matchedCategory.id
                    categoryName = $matchedCategory.name
                    title = $svcName
                    benefitBadge = $badge
                    target = if ($pTarget) { $pTarget.Trim() } else { $dTarget }
                    summary = if ($pSummary) { $pSummary.Trim() } else { $svcName }
                    details = $details
                    agency = if ($pAgency) { $pAgency } else { "대한민국 정부" }
                    applyUrl = if ($pUrl) { $pUrl } else { "https://www.gov.kr" }
                    applyName = $dApplyName
                    docs = $dDocs
                    tags = @($matchedKeyword, $matchedCategory.id)
                }

                $filteredList.Add($policyObj) | Out-Null
            }
        }
    } catch {
        Write-Warning "Failed on page $page : $($_.Exception.Message)"
        break
    }
}

Write-Host "Total extracted government policies: $($filteredList.Count)"

$finalOutput = [ordered]@{
    updatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
    source = $dSource
    totalCount = $filteredList.Count
    policies = $filteredList
}

$outputJson = $finalOutput | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outputFile, $outputJson, [System.Text.Encoding]::UTF8)

Write-Host "Successfully generated: $outputFile"
Write-Host "JSON Size: $($outputJson.Length) characters"
