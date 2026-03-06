package com.example.nextgen_pds_kiosk.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.NavType
import com.example.nextgen_pds_kiosk.ui.screens.*

@Composable
fun KioskNavHost(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Welcome.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = {
            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, animationSpec = tween(500))
        },
        exitTransition = {
            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Left, animationSpec = tween(500))
        },
        popEnterTransition = {
            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Right, animationSpec = tween(500))
        },
        popExitTransition = {
            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, animationSpec = tween(500))
        }
    ) {
        // ── 1. WELCOME ──────────────────────────────────────────────────────
        composable(route = Screen.Welcome.route) {
            WelcomeScreen(
                onNavigateNext = { navController.navigate(Screen.QrScan.route) },
                onNavigateAdmin = { navController.navigate(Screen.AdminLogin.route) }
            )
        }

        // ── 2. QR SCAN ──────────────────────────────────────────────────────
        composable(route = Screen.QrScan.route) {
            QrScanScreen(
                onCardFound = { cardNo ->
                    navController.navigate(Screen.CardDetails.createRoute(cardNo))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── 3. CARD DETAILS + MEMBER SELECTION ──────────────────────────────
        composable(
            route = Screen.CardDetails.route,
            arguments = listOf(navArgument("cardNo") { type = NavType.StringType })
        ) { backStackEntry ->
            val cardNo = backStackEntry.arguments?.getString("cardNo") ?: ""
            CardDetailsScreen(
                cardNo = cardNo,
                onMemberSelected = { cn, memberId ->
                    navController.navigate(Screen.FaceVerify.createRoute(cn, memberId))
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── 4. FACE VERIFY ───────────────────────────────────────────────────
        composable(
            route = Screen.FaceVerify.route,
            arguments = listOf(
                navArgument("cardNo")   { type = NavType.StringType },
                navArgument("memberId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val cardNo   = backStackEntry.arguments?.getString("cardNo") ?: ""
            val memberId = backStackEntry.arguments?.getString("memberId") ?: ""
            FaceVerifyScreen(
                cardNo = cardNo,
                memberId = memberId,
                onVerifySuccess = { navController.navigate(Screen.QuantitySelection.route) },
                onNavigateBack  = { navController.popBackStack() }
            )
        }

        // ── 5. QUANTITY SELECTION ────────────────────────────────────────────
        composable(route = Screen.QuantitySelection.route) {
            QuantitySelectionScreen(
                onNavigateNext = { navController.navigate(Screen.Dispensing.route) },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ── 6. DISPENSING ────────────────────────────────────────────────────
        composable(route = Screen.Dispensing.route) {
            DispensingScreen(
                onNavigateNext = {
                    navController.navigate(Screen.Completion.route) {
                        popUpTo(Screen.Welcome.route) { inclusive = false }
                    }
                }
            )
        }

        // ── 7. COMPLETION ─────────────────────────────────────────────────────
        composable(route = Screen.Completion.route) {
            CompletionScreen(
                onGoHome = {
                    // popUpTo(0) clears the ENTIRE back stack, then we navigate to Welcome fresh.
                    // Using popUpTo(Welcome) { inclusive = true } was removing Welcome *before*
                    // navigating to it, resulting in a blank screen.
                    navController.navigate(Screen.Welcome.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }


        // ── ADMIN LOGIN ───────────────────────────────────────────────────────
        composable(route = Screen.AdminLogin.route) {
            AdminLoginScreen(
                onNavigateBack = { navController.popBackStack() },
                onLoginSuccess = {
                    navController.navigate(Screen.AdminDashboard.route) {
                        popUpTo(Screen.AdminLogin.route) { inclusive = true }
                    }
                }
            )
        }

        // ── ADMIN DASHBOARD ───────────────────────────────────────────────────
        composable(route = Screen.AdminDashboard.route) {
            val context = androidx.compose.ui.platform.LocalContext.current
            val activity = context as? android.app.Activity
            AdminDashboardScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateEnrollment = { navController.navigate(Screen.Enrollment.route) },
                onExitKiosk = {
                    activity?.stopLockTask()
                    activity?.finishAndRemoveTask()
                }
            )
        }

        // ── ENROLLMENT ────────────────────────────────────────────────────────
        composable(route = Screen.Enrollment.route) {
            EnrollmentScreen(onNavigateBack = { navController.popBackStack() })
        }
    }
}
