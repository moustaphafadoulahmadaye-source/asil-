New-Item -ItemType Directory -Force -Path 'asil-logistics\public\img\icons'
Add-Type -AssemblyName System.Drawing

function Draw-AsilIcon($size, $outPath, $isMaskable) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 1. Background
    $bgRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        [System.Drawing.ColorTranslator]::FromHtml('#071f24'),
        [System.Drawing.ColorTranslator]::FromHtml('#0e3b43'),
        45.0
    )
    $g.FillRectangle($bgBrush, $bgRect)
    $bgBrush.Dispose()

    # Scaling factor
    # Base logo emblem box is 44x44, center at (26, 25)
    $scale = if ($isMaskable) { ($size * 0.55) / 44.0 } else { ($size * 0.78) / 44.0 }
    $cx = $size / 2.0
    $cy = $size / 2.0

    function P($x, $y) {
        $dx = ($x - 26.0) * $scale
        $dy = ($y - 25.0) * $scale
        return New-Object System.Drawing.PointF([float]($cx + $dx), [float]($cy + $dy))
    }

    # 2. Outer Gold Hexagon
    $outerHex = @(
        (P 26 10),
        (P 39 17.5),
        (P 39 32.5),
        (P 26 40),
        (P 13 32.5),
        (P 13 17.5)
    )
    $penWidth = [Math]::Max(1.5, 2.5 * $scale)
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#f2c230'), [float]$penWidth)
    $goldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPolygon($goldPen, $outerHex)
    $goldPen.Dispose()

    # 3. Inner Mint Hexagon
    $innerHex = @(
        (P 26 16),
        (P 34 20.5),
        (P 34 28.5),
        (P 26 33),
        (P 18 28.5),
        (P 18 20.5)
    )
    $mintBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#2dd4bf'))
    $g.FillPolygon($mintBrush, $innerHex)
    $mintBrush.Dispose()

    # 4. Gold Triangle
    $tri = @(
        (P 26 18),
        (P 30 29),
        (P 22 29)
    )
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f2c230'))
    $g.FillPolygon($goldBrush, $tri)
    $goldBrush.Dispose()

    # 5. White Dot
    $dotR = [Math]::Max(1.0, 2.8 * $scale)
    $dotP = P 26 24
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($whiteBrush, [float]($dotP.X - $dotR), [float]($dotP.Y - $dotR), [float]($dotR * 2), [float]($dotR * 2))
    $whiteBrush.Dispose()

    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated: $outPath ($size x $size)"
}

Draw-AsilIcon 192 'asil-logistics\public\img\icons\icon-192.png' $false
Draw-AsilIcon 512 'asil-logistics\public\img\icons\icon-512.png' $false
Draw-AsilIcon 512 'asil-logistics\public\img\icons\icon-maskable-512.png' $true
Draw-AsilIcon 180 'asil-logistics\public\img\icons\apple-touch-icon.png' $false
Draw-AsilIcon 32 'asil-logistics\public\img\icons\favicon-32.png' $false
Draw-AsilIcon 1024 'asil-logistics\public\img\icons\store-icon-1024.png' $false
