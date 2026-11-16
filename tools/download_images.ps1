$images = @{
    'cargo-freight.jpg' = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1000&auto=format&fit=crop&q=85'
    'passenger-travel.jpg' = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1000&auto=format&fit=crop&q=85'
    'facility-maintenance.jpg' = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=85'
    'corporate-onboarding.jpg' = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=85'
    'fleet-truck.jpg' = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1000&auto=format&fit=crop&q=85'
    'executive-sedan.jpg' = 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1000&auto=format&fit=crop&q=85'
    'hero-logistics.jpg' = 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1200&auto=format&fit=crop&q=85'
}

foreach ($name in $images.Keys) {
    $dest = Join-Path 'asil-logistics\public\img' $name
    Write-Host "Downloading $name ..."
    Invoke-WebRequest -Uri $images[$name] -OutFile $dest
    $info = Get-Item $dest
    Write-Host "-> Saved $name ($($info.Length) bytes)"
}
